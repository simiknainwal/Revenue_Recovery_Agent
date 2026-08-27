const { getConnection } = require("./db");
const { decideNextAction } = require("./decisionEngine");
const { executeAction } = require("./actionExecutor");
const { checkPromise } = require("./promiseTracker");


async function processDueCases() {

    let connection;

    try {

        connection = await getConnection();

        // Find all cases whose next action is due
        const result = await connection.execute(
            `
            SELECT
                case_id,
                customer_id,
                case_type,
                status,
                next_action,
                next_action_time,
                payment_id,
                checkout_id
            FROM RECOVERY_CASE
            WHERE next_action_time <= SYSDATE
              AND status IN ('OPEN', 'IN_PROGRESS', 'PROMISED')
            ORDER BY next_action_time
            `
        );

        const dueCases = result.rows;
        const processedCases = [];


        for (const recoveryCase of dueCases) {

            // ----------------------------------
            // PROMISE-TO-PAY CASE
            // ----------------------------------

            if (recoveryCase.STATUS === "PROMISED") {

                const promiseResult =
                    await checkPromise(
                        connection,
                        recoveryCase
                    );

                processedCases.push({
                    caseId: recoveryCase.CASE_ID,
                    previousStatus: "PROMISED",
                    action: promiseResult.action,
                    newStatus: promiseResult.status,
                    reason: promiseResult.reason
                });

                continue;
            }


            // ----------------------------------
            // GET PREVIOUS ATTEMPTS
            // ----------------------------------

            const attemptResult =
                await connection.execute(
                    `
                    SELECT *
                    FROM RECOVERY_ATTEMPT
                    WHERE case_id = :caseId
                    ORDER BY attempt_time DESC
                    `,
                    {
                        caseId: recoveryCase.CASE_ID
                    }
                );


            // ----------------------------------
            // GET CUSTOMER INTERACTIONS
            // ----------------------------------

            const interactionResult =
                await connection.execute(
                    `
                    SELECT *
                    FROM CUSTOMER_INTERACTION
                    WHERE case_id = :caseId
                    ORDER BY interaction_id DESC
                    `,
                    {
                        caseId: recoveryCase.CASE_ID
                    }
                );


            // ----------------------------------
            // BOUNDED RECOVERY
            // ----------------------------------

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
                    {
                        caseId: recoveryCase.CASE_ID
                    }
                );

                processedCases.push({
                    caseId: recoveryCase.CASE_ID,
                    action: "CLOSE_CASE",
                    reason: "Maximum attempts reached"
                });

                continue;
            }


            // ----------------------------------
            // DECISION ENGINE
            // ----------------------------------

            const decision = decideNextAction(
                recoveryCase,
                attemptResult.rows,
                interactionResult.rows
            );


            // ----------------------------------
            // EXECUTE ACTION
            // ----------------------------------

            const execution = await executeAction(
                connection,
                recoveryCase,
                decision.action
            );


            processedCases.push({
                caseId: recoveryCase.CASE_ID,
                previousAction: recoveryCase.NEXT_ACTION,
                decidedAction: decision.action,
                reason: decision.reason,
                execution
            });
        }


        await connection.commit();


        return {
            totalDueCases: dueCases.length,
            processedCases
        };


    } catch (err) {

        if (connection) {
            await connection.rollback();
        }

        throw err;

    } finally {

        if (connection) {
            await connection.close();
        }
    }
}


module.exports = { processDueCases };