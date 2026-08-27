// Now we’ll make process-due-cases handle PROMISED cases automatically instead of only returning "CHECK_PROMISE".

// The clean way is to move promise-checking into a reusable function.

async function checkPromise(connection, recoveryCase) {

    let paymentResult;

    if (recoveryCase.CASE_TYPE === "SUBSCRIPTION_FAILURE") {

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

    } else if (
        recoveryCase.CASE_TYPE === "CHECKOUT_ABANDONMENT"
    ) {

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

        const orderId =
            checkoutResult.rows[0].ORDER_ID;

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
            `Unsupported case type: ${recoveryCase.CASE_TYPE}`
        );
    }

    // Payment received
    if (paymentResult.rows.length > 0) {

        await connection.execute(
            `
            UPDATE RECOVERY_CASE
            SET status = 'RECOVERED',
                next_action = NULL,
                next_action_time = NULL
            WHERE case_id = :caseId
            `,
            {
                caseId: recoveryCase.CASE_ID
            }
        );

        return {
            action: "CLOSE_CASE",
            status: "RECOVERED",
            reason: "Payment received"
        };
    }

    // Promise broken
    await connection.execute(
        `
        UPDATE RECOVERY_CASE
        SET status = 'IN_PROGRESS',
            next_action = 'SEND_REMINDER',
            next_action_time = SYSDATE
        WHERE case_id = :caseId
        `,
        {
            caseId: recoveryCase.CASE_ID
        }
    );

    return {
        action: "SEND_REMINDER",
        status: "IN_PROGRESS",
        reason: "Promise date passed without payment"
    };
}

module.exports = { checkPromise };