require("dotenv").config();
const { decideNextAction } = require("./decisionEngine");
const { detectIntent } = require("./intentDetector");
const { extractPromiseDate } = require("./dateExtractor");
const { analyzeCustomerMessage } =
    require("./aiIntentDetector");
    const { checkPromise } = require("./promiseTracker");
    const { executeAction } = require("./actionExecutor");
const cron = require("node-cron");
const { startAgentScheduler } = require("./agentScheduler");
const { processDueCases } = require("./agentProcessor");
const cors = require("cors");
const express = require("express");
const app = express();
    app.use(express.json());
    app.use(cors());
const { getConnection } = require("./db");

// const promiseDate = extractPromiseDate(message);

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Revenue Recovery Agent API is running");
});

const PORT = process.env.PORT || 5000;

app.get("/api/test-db", async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT * FROM CUSTOMER`
        );

        res.json({
            success: true,
            rows: result.rows
        });

    } catch (err) {
        console.error("DATABASE ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

//Main API

app.get("/api/revenue-risk", async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(`
            SELECT *
            FROM REVENUE_RISK
            ORDER BY amount_at_risk DESC
        `);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (err) {
        console.error("REVENUE RISK ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});


//For recovery case

app.get("/api/recovery-cases", async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(`
            SELECT
                rc.case_id,
                rc.customer_id,
                c.name AS customer_name,
                c.phone,
                c.email,
                c.preferred_language,
                rc.case_type,
                rc.status,
                rc.risk_score,
                rc.next_action,
                rc.next_action_time,
                rc.payment_id,
                rc.checkout_id
            FROM RECOVERY_CASE rc
            JOIN CUSTOMER c
                ON rc.customer_id = c.customer_id
            ORDER BY rc.risk_score DESC
        `);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (err) {

        console.error("RECOVERY CASE ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {

        if (connection) {
            await connection.close();
        }
    }
});


// Browser
//    ↓
// Express API
//    ↓
// GET /api/recovery-cases/6
//    ↓
// node-oracledb
//    ↓
// Oracle 21c XE (Docker)
//    ↓
// RECOVERY_CASE + CUSTOMER


app.get("/api/recovery-cases/:id", async (req, res) => {
    let connection;

    try {
        const caseId = Number(req.params.id);

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                rc.case_id,
                rc.case_type,
                rc.status,
                rc.risk_score,
                rc.next_action,
                rc.next_action_time,
                c.customer_id,
                c.name AS customer_name,
                c.phone,
                c.email,
                c.preferred_language
             FROM RECOVERY_CASE rc
             JOIN CUSTOMER c
                ON rc.customer_id = c.customer_id
             WHERE rc.case_id = :caseId`,
            { caseId }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Recovery case not found"
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {

        if (connection) {
            await connection.close();
        }
    }
});


// GET /api/agent/decide/6
//           ↓
//      Read database
//           ↓
//      Apply rules
//           ↓
//      Recommend
//        FOLLOW_UP
//           ↓
//      No DB modification

app.get("/api/agent/decide/:id", async (req, res) => {

    let connection;

    try {

        const caseId = Number(req.params.id);

        connection = await getConnection();

        // Get recovery case
        const caseResult = await connection.execute(
            `
            SELECT *
            FROM RECOVERY_CASE
            WHERE case_id = :caseId
            `,
            { caseId }
        );

        if (caseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Recovery case not found"
            });
        }

        const recoveryCase = caseResult.rows[0];


        // Get previous attempts
        const attemptResult = await connection.execute(
            `
            SELECT *
            FROM RECOVERY_ATTEMPT
            WHERE case_id = :caseId
            ORDER BY attempt_time DESC
            `,
            { caseId }
        );


        // Get customer interactions
        const interactionResult = await connection.execute(
            `
            SELECT *
            FROM CUSTOMER_INTERACTION
            WHERE case_id = :caseId
            ORDER BY interaction_id DESC
            `,
            { caseId }
        );


        // Agent decision
        const decision = decideNextAction(
            recoveryCase,
            attemptResult.rows,
            interactionResult.rows
        );

        const execution = await executeAction(
    connection,
    recoveryCase,
    decision.action
);

        res.json({
            success: true,
            caseId: caseId,
            currentStatus: recoveryCase.STATUS,
            currentAction: recoveryCase.NEXT_ACTION,
            decision: decision
        });

    } catch (err) {

        console.error("AGENT ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {

        if (connection) {
            await connection.close();
        }
    }
});



app.post("/api/agent/execute/:id", async (req, res) => {

    let connection;

    try {

        const caseId = Number(req.params.id);

        if (!Number.isInteger(caseId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID"
            });
        }

        connection = await getConnection();


        // ---------------------------
        // 1. Get recovery case
        // ---------------------------

        const caseResult = await connection.execute(
            `
            SELECT *
            FROM RECOVERY_CASE
            WHERE case_id = :caseId
            `,
            { caseId }
        );

        if (caseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Recovery case not found"
            });
        }

        const recoveryCase = caseResult.rows[0];


        // ---------------------------
        // 2. Get previous attempts
        // ---------------------------

        const attemptResult = await connection.execute(
            `
            SELECT *
            FROM RECOVERY_ATTEMPT
            WHERE case_id = :caseId
            ORDER BY attempt_time DESC
            `,
            { caseId }
        );


        // ---------------------------
        // 3. Get interactions
        // ---------------------------

        const interactionResult = await connection.execute(
            `
            SELECT *
            FROM CUSTOMER_INTERACTION
            WHERE case_id = :caseId
            ORDER BY interaction_id DESC
            `,
            { caseId }
        );


        // ---------------------------
        // 4. Bounded recovery
        // ---------------------------

        const MAX_ATTEMPTS = 3;

        if (attemptResult.rows.length >= MAX_ATTEMPTS) {

            await connection.execute(
                `
                UPDATE RECOVERY_CASE
                SET status = 'CLOSED',
                    next_action = NULL,
                    next_action_time = NULL
                WHERE case_id = :caseId
                `,
                { caseId }
            );

            await connection.commit();

            return res.json({
                success: true,
                caseId,
                executed: false,
                status: "CLOSED",
                reason: "Maximum recovery attempts reached"
            });
        }


        // ---------------------------
        // 5. Ask decision engine
        // ---------------------------

        const decision = decideNextAction(
            recoveryCase,
            attemptResult.rows,
            interactionResult.rows
        );


        // ---------------------------
        // 6. Update recovery case
        // ---------------------------

        await connection.execute(
            `
            UPDATE RECOVERY_CASE
            SET status = 'IN_PROGRESS',
                next_action = :action,
                next_action_time = SYSDATE
            WHERE case_id = :caseId
            `,
            {
                action: decision.action,
                caseId
            }
        );


        await connection.commit();


        res.json({
            success: true,
            caseId,
            executed: true,
            decision
        });


    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        console.error("AGENT EXECUTION ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });


    } finally {

        if (connection) {
            await connection.close();
        }
    }
});


// Decision Engine
//      ↓
// VOICE_CALL
//      ↓
// Simulated customer response
//      ↓
// NO_RESPONSE
//      ↓
// RECOVERY_ATTEMPT inserted ✓
//      ↓
// RECOVERY_CASE updated ✓

app.post("/api/recovery-cases/:id/result", async (req, res) => {

    let connection;

    try {

        const caseId = Number(req.params.id);
        const { channel, result } = req.body;

        if (!Number.isInteger(caseId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID"
            });
        }

        if (!channel || !result) {
            return res.status(400).json({
                success: false,
                message: "channel and result are required"
            });
        }

        connection = await getConnection();

        // 1. Find recovery case
        const caseResult = await connection.execute(
            `
            SELECT *
            FROM RECOVERY_CASE
            WHERE case_id = :caseId
            `,
            { caseId }
        );

        if (caseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Recovery case not found"
            });
        }

        const recoveryCase = caseResult.rows[0];

        // 2. Record what actually happened
        await connection.execute(
            `
            INSERT INTO RECOVERY_ATTEMPT
            (
                attempt_id,
                case_id,
                channel,
                action,
                result,
                attempt_time
            )
            VALUES
            (
                recovery_attempt_seq.NEXTVAL,
                :caseId,
                :channel,
                :action,
                :result,
                SYSDATE
            )
            `,
            {
                caseId,
                channel,
                action: recoveryCase.NEXT_ACTION,
                result
            }
        );

        // 3. Update case according to result
        if (result === "SUCCESS") {

            await connection.execute(
                `
                UPDATE RECOVERY_CASE
                SET status = 'RECOVERED',
                    next_action = NULL,
                    next_action_time = NULL
                WHERE case_id = :caseId
                `,
                { caseId }
            );

        } else if (result === "PROMISED_TO_PAY") {

            await connection.execute(
                `
                UPDATE RECOVERY_CASE
                SET status = 'PROMISED',
                    next_action = 'FOLLOW_UP',
                    next_action_time = SYSDATE + 3
                WHERE case_id = :caseId
                `,
                { caseId }
            );

        } else if (result === "NO_RESPONSE") {

            await connection.execute(
                `
                UPDATE RECOVERY_CASE
                SET status = 'IN_PROGRESS'
                WHERE case_id = :caseId
                `,
                { caseId }
            );
        }

        await connection.commit();

        res.json({
            success: true,
            caseId,
            channel,
            action: recoveryCase.NEXT_ACTION,
            result,
            message: "Recovery attempt recorded successfully"
        });

    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        console.error("RESULT ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {

        if (connection) {
            await connection.close();
        }
    }
});


// Revenue-at-risk detected
//         ↓
// Create RECOVERY_CASE
//         ↓
// Agent chooses action
//         ↓
// Action/result recorded
//         ↓
// Customer responds
//         ↓
// Groq understands response
//         ↓
// Update case
//         ↓
// PROMISED_TO_PAY
//         ↓
// Wait until promised date
//         ↓
// Check whether payment happened
//        ↙        ↘
//      YES         NO
//       ↓           ↓
//  RECOVERED    FOLLOW_UP

app.post("/api/recovery-cases/:id/message", async (req, res) => {

    let connection;

    try {

        const caseId = Number(req.params.id);
        const { message, channel = "VOICE", language = "HINGLISH" } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Customer message is required"
            });
        }

        connection = await getConnection();

        // Check case exists
        const caseResult = await connection.execute(
            `
            SELECT *
            FROM RECOVERY_CASE
            WHERE case_id = :caseId
            `,
            { caseId }
        );

        if (caseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Recovery case not found"
            });
        }

let intent;
let promiseDate;
let aiConfidence = 0;

try {
    const aiResult = await analyzeCustomerMessage(message);

   aiConfidence = Number(aiResult.confidence) || 0;

    if (aiConfidence >= 0.80) {
        intent = aiResult.intent;

        if (aiResult.promisedDate) {
            promiseDate = new Date(aiResult.promisedDate);
        } else {
            promiseDate = null;
        }

    } else {
        // fallback
        intent = detectIntent(message);
        promiseDate = extractPromiseDate(message);
    }

} catch (aiError) {

    console.error("AI failed, using fallback:", aiError.message);

    intent = detectIntent(message);
    promiseDate = extractPromiseDate(message);
}

console.log("Detected intent:", intent);
console.log("Promise date:", promiseDate);

        // Store interaction
        await connection.execute(
            `
            INSERT INTO CUSTOMER_INTERACTION
            (
                interaction_id,
                case_id,
                channel,
                language,
                customer_message,
                detected_intent
            )
            VALUES
            (
                customer_interaction_seq.NEXTVAL,
                :caseId,
                :channel,
                :language,
                :message,
                :intent
            )
            `,
            {
                caseId,
                channel,
                language,
                message,
                intent
            }
        );

        // Update recovery case
       if (intent === "PROMISE_TO_PAY") {

    let followUpDate = promiseDate;

    if (!followUpDate) {
        followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 3);
    }

    await connection.execute(
        `
        UPDATE RECOVERY_CASE
        SET status = 'PROMISED',
            next_action = 'FOLLOW_UP',
            next_action_time = :followUpDate
        WHERE case_id = :caseId
        `,
        {
            followUpDate,
            caseId
        }
    );



        } else if (intent === "PAY_NOW") {

            await connection.execute(
                `
                UPDATE RECOVERY_CASE
                SET status = 'IN_PROGRESS',
                    next_action = 'SEND_PAYMENT_LINK',
                    next_action_time = SYSDATE
                WHERE case_id = :caseId
                `,
                { caseId }
            );

        } else if (intent === "REFUSE_TO_PAY") {

            await connection.execute(
                `
                UPDATE RECOVERY_CASE
                SET status = 'CLOSED',
                    next_action = NULL,
                    next_action_time = NULL
                WHERE case_id = :caseId
                `,
                { caseId }
            );
        }

        await connection.commit();

       res.json({
    success: true,
    caseId,
    customerMessage: message,
    detectedIntent: intent,
    promisedDate: promiseDate,
    aiConfidence,
    message: "Customer interaction processed successfully"
});

    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        console.error("MESSAGE ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {

        if (connection) {
            await connection.close();
        }
    }
});


//For AI intent detection
app.post("/api/ai/analyze", async (req, res) => {

    try {

        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Customer message is required"
            });
        }

        const analysis =
            await analyzeCustomerMessage(message);

        res.json({
            success: true,
            customerMessage: message,
            analysis
        });

    } catch (err) {

        console.error("AI ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

//Checks whether a successful payment exist.

app.post("/api/agent/check-promise/:id", async (req, res) => {
    let connection;

    try {
        const caseId = Number(req.params.id);

        if (!Number.isInteger(caseId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid case ID"
            });
        }

        connection = await getConnection();

        // Get case information
        const caseResult = await connection.execute(
            `
            SELECT
                rc.case_id,
                rc.customer_id,
                rc.payment_id,
                rc.checkout_id,
                rc.case_type,
                rc.status,
                rc.next_action,
                rc.next_action_time
            FROM RECOVERY_CASE rc
            WHERE rc.case_id = :caseId
            `,
            { caseId }
        );

        if (caseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Recovery case not found"
            });
        }

        const recoveryCase = caseResult.rows[0];

        // Only promised cases should enter this workflow
        if (recoveryCase.STATUS !== "PROMISED") {
            return res.status(400).json({
                success: false,
                message: "This case is not in PROMISED state"
            });
        }

        // Don't follow up before the promised date
        if (
            recoveryCase.NEXT_ACTION_TIME &&
            new Date(recoveryCase.NEXT_ACTION_TIME) > new Date()
        ) {
            return res.json({
                success: true,
                caseId,
                actionTaken: "NONE",
                status: "PROMISED",
                message: "Promise date has not arrived yet",
                followUpTime: recoveryCase.NEXT_ACTION_TIME
            });
        }

        // Check whether payment was made for the EXACT subscription/order
let paymentResult;

if (recoveryCase.CASE_TYPE === "SUBSCRIPTION_FAILURE") {

    // Find the subscription associated with the original failed payment
    const failedPaymentResult = await connection.execute(
        `
        SELECT subscription_id
        FROM PAYMENT
        WHERE payment_id = :paymentId
        `,
        {
            paymentId: recoveryCase.PAYMENT_ID
        }
    );

    if (failedPaymentResult.rows.length === 0) {
        throw new Error("Original failed payment not found");
    }

    const subscriptionId =
        failedPaymentResult.rows[0].SUBSCRIPTION_ID;

    // Check for a successful payment for THIS subscription
    paymentResult = await connection.execute(
        `
        SELECT payment_id
        FROM PAYMENT
        WHERE subscription_id = :subscriptionId
          AND status = 'SUCCESS'
          AND payment_time >= :promiseTime
        FETCH FIRST 1 ROW ONLY
        `,
        {
            subscriptionId,
            promiseTime: recoveryCase.NEXT_ACTION_TIME
        }
    );

} else if (recoveryCase.CASE_TYPE === "CHECKOUT_ABANDONMENT") {

    // Find order associated with this checkout
    const checkoutResult = await connection.execute(
        `
        SELECT order_id
        FROM CHECKOUT_SESSION
        WHERE checkout_id = :checkoutId
        `,
        {
            checkoutId: recoveryCase.CHECKOUT_ID
        }
    );

    if (checkoutResult.rows.length === 0) {
        throw new Error("Checkout session not found");
    }

    const orderId = checkoutResult.rows[0].ORDER_ID;

    // Check successful payment for THIS order
    paymentResult = await connection.execute(
        `
        SELECT payment_id
        FROM PAYMENT
        WHERE order_id = :orderId
          AND status = 'SUCCESS'
          AND payment_time >= :promiseTime
        FETCH FIRST 1 ROW ONLY
        `,
        {
            orderId,
            promiseTime: recoveryCase.NEXT_ACTION_TIME
        }
    );

} else {

    throw new Error(
        `Unsupported recovery case type: ${recoveryCase.CASE_TYPE}`
    );
}

        // Payment found
        if (paymentResult.rows.length > 0) {

            await connection.execute(
                `
                UPDATE RECOVERY_CASE
                SET status = 'RECOVERED',
                    next_action = NULL,
                    next_action_time = NULL
                WHERE case_id = :caseId
                `,
                { caseId }
            );

            await connection.commit();

            return res.json({
                success: true,
                caseId,
                actionTaken: "CLOSE_CASE",
                status: "RECOVERED",
                message: "Payment received. Recovery case closed."
            });
        }

        // No payment after promise date
        await connection.execute(
            `
            UPDATE RECOVERY_CASE
            SET status = 'IN_PROGRESS',
                next_action = 'SEND_REMINDER',
                next_action_time = SYSDATE
            WHERE case_id = :caseId
            `,
            { caseId }
        );

        await connection.commit();

        return res.json({
            success: true,
            caseId,
            actionTaken: "SEND_REMINDER",
            status: "IN_PROGRESS",
            message: "Promise date passed but payment was not received."
        });

    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        console.error("PROMISE CHECK ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {

        if (connection) {
            await connection.close();
        }
    }
});

//For all process dues.
app.post("/api/agent/process-due-cases", async (req, res) => {

    try {

        const result = await processDueCases();

        res.json({
            success: true,
            ...result
        });

    } catch (err) {

        console.error("PROCESS DUE CASES ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

//                   ┌──────────────────┐
//                   │   node-cron      │
//                   │   every 5 min    │
//                   └────────┬─────────┘
//                            ↓
//                   processDueCases()
//                            ↓
//               ┌────────────┴────────────┐
//               ↓                         ↓
//        PROMISED case              Other due case
//               ↓                         ↓
//        Promise Tracker            Decision Engine
//               ↓                         ↓
//        Check payment              Choose action
//               ↓                         ↓
//        ┌──────┴──────┐            Action Executor
//        ↓             ↓                   ↓
//    RECOVERED     FOLLOW-UP        RECOVERY_ATTEMPT
//        └─────────────┴───────────────────┘
//                            ↓
//                        Oracle DB


//For case history

app.get("/api/recovery-cases/:id/history", async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const caseId = req.params.id;

        const attemptsResult = await connection.execute(
            `
            SELECT
                attempt_id,
                case_id,
                channel,
                action,
                result,
                attempt_time
            FROM RECOVERY_ATTEMPT
            WHERE case_id = :caseId
            ORDER BY attempt_time DESC
            `,
            {
                caseId
            }
        );

        const interactionsResult = await connection.execute(
            `
            SELECT *
            FROM CUSTOMER_INTERACTION
            WHERE case_id = :caseId
            ORDER BY interaction_id DESC
            `,
            {
                caseId
            }
        );

        res.json({
            success: true,
            attempts: attemptsResult.rows,
            interactions: interactionsResult.rows
        });

    } catch (err) {
        console.error("CASE HISTORY ERROR:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});


app.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

    startAgentScheduler();
});