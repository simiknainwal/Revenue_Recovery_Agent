function decideNextAction(recoveryCase, attempts, interactions) {

    // 1. Already finished
    if (
        recoveryCase.STATUS === "RECOVERED" ||
        recoveryCase.STATUS === "CLOSED"
    ) {
        return {
            action: "NONE",
            reason: "Recovery case is already completed"
        };
    }

    // 2. Check latest customer interaction
    if (interactions.length > 0) {

        const latestInteraction = interactions[0];

        if (latestInteraction.DETECTED_INTENT === "PAY_NOW") {
            return {
                action: "SEND_PAYMENT_LINK",
                reason: "Customer has indicated that they are ready to pay"
            };
        }

        if (latestInteraction.DETECTED_INTENT === "PROMISE_TO_PAY") {
            return {
                action: "FOLLOW_UP",
                reason: "Customer has promised to pay later"
            };
        }
    }

    // 3. No recovery attempt has been made yet
    if (attempts.length === 0) {

        if (recoveryCase.CASE_TYPE === "SUBSCRIPTION_FAILURE") {
            return {
                action: "RETRY_PAYMENT",
                reason: "First recovery attempt for failed subscription"
            };
        }

        if (recoveryCase.CASE_TYPE === "CHECKOUT_ABANDONMENT") {
            return {
                action: "SEND_REMINDER",
                reason: "First recovery attempt for abandoned checkout"
            };
        }
    }

    // 4. Check previous recovery attempt
    const latestAttempt = attempts[0];

    if (latestAttempt && latestAttempt.RESULT === "NO_RESPONSE") {

        if (latestAttempt.CHANNEL === "SMS") {
            return {
                action: "VOICE_CALL",
                reason: "Customer did not respond to SMS"
            };
        }

        if (latestAttempt.CHANNEL === "EMAIL") {
            return {
                action: "SMS_REMINDER",
                reason: "Customer did not respond to email"
            };
        }

        if (latestAttempt.CHANNEL === "VOICE") {
            return {
                action: "FOLLOW_UP",
                reason: "Customer did not respond to voice call"
            };
        }
    }

    return {
        action: recoveryCase.NEXT_ACTION,
        reason: "Continue with currently scheduled recovery action"
    };
}

module.exports = { decideNextAction };