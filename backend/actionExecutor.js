async function executeAction(connection, recoveryCase, action) {

    let channel;

    switch (action) {
        case "VOICE_CALL":
            channel = "VOICE";
            break;

        case "SEND_REMINDER":
            channel = "SMS";
            break;

        case "SEND_PAYMENT_LINK":
            channel = "SMS";
            break;

        case "RETRY_PAYMENT":
            channel = "SYSTEM";
            break;

        case "FOLLOW_UP":
            channel = "SMS";
            break;

        default:
            channel = "SYSTEM";
    }

    // Insert recovery attempt using Oracle sequence
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
            'SENT',
            SYSDATE
        )
        `,
        {
            caseId: recoveryCase.CASE_ID,
            channel,
            action
        }
    );

    // Prevent the same case from being processed immediately again
    await connection.execute(
        `
        UPDATE RECOVERY_CASE
        SET status = 'IN_PROGRESS',
            next_action = :action,
            next_action_time = SYSDATE + 1
        WHERE case_id = :caseId
        `,
        {
            action,
            caseId: recoveryCase.CASE_ID
        }
    );

    return {
        channel,
        action,
        result: "SENT"
    };
}

module.exports = { executeAction };