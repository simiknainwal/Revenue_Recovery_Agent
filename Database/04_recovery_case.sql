#Created one unified revenue_risk view

CREATE OR REPLACE VIEW REVENUE_RISK AS

SELECT
    c.customer_id,
    c.name AS customer_name,
    'CHECKOUT_ABANDONMENT' AS risk_type,
    co.order_id AS reference_id,
    co.amount AS amount_at_risk,
    'HIGH' AS risk_level
FROM CUSTOMER c,CUSTOMER_ORDER co,CHECKOUT_SESSION cs

    where c.customer_id = co.customer_id AND co.order_id = cs.order_id AND cs.status = 'ABANDONED'

UNION ALL

SELECT
    c.customer_id,
    c.name AS customer_name,
    'SUBSCRIPTION_FAILURE' AS risk_type,
    p.payment_id AS reference_id,
    p.amount AS amount_at_risk,
    'HIGH' AS risk_level
FROM CUSTOMER c,SUBSCRIPTION s,PAYMENT p

    where c.customer_id = s.customer_id AND s.subscription_id = p.subscription_id AND p.status = 'FAILED';

select* from revenue_risk

#This will insert the row only when it doesn't already exists in the table.

INSERT INTO RECOVERY_CASE
(
    case_id,
    customer_id,
    checkout_id,
    case_type,
    status,
    risk_score,
    next_action,
    next_action_time
)
SELECT
    recovery_case_seq.NEXTVAL,
    cs.customer_id,
    cs.checkout_id,
    'CHECKOUT_ABANDONMENT',
    'OPEN',
    70,
    'SEND_REMINDER',
    SYSDATE
FROM CHECKOUT_SESSION cs
WHERE cs.status = 'ABANDONED'
AND NOT EXISTS (
    SELECT 1
    FROM RECOVERY_CASE rc
    WHERE rc.checkout_id = cs.checkout_id
    AND rc.status IN ('OPEN', 'IN_PROGRESS')
);

#Same is for fails subscriptions.

INSERT INTO RECOVERY_CASE
(
    case_id,
    customer_id,
    payment_id,
    case_type,
    status,
    risk_score,
    next_action,
    next_action_time
)
SELECT
    recovery_case_seq.NEXTVAL,
    p.customer_id,
    p.payment_id,
    'SUBSCRIPTION_FAILURE',
    'OPEN',
    85,
    'RETRY_PAYMENT',
    SYSDATE
FROM PAYMENT p
WHERE p.status = 'FAILED'
AND p.subscription_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1
    FROM RECOVERY_CASE rc
    WHERE rc.payment_id = p.payment_id
    AND rc.status IN ('OPEN', 'IN_PROGRESS')
);

select* from RECOVERY_CASE

SELECT MAX(case_id) AS max_case_id
FROM RECOVERY_CASE;

#For sequencing we start from 7 as my highest case_ID is 6

CREATE SEQUENCE recovery_case_seq
START WITH 7
INCREMENT BY 1
NOCACHE;

SELECT recovery_case_seq.NEXTVAL
FROM dual;




#Simulating the action because we don't have SMS/Voice Call service.

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
    10,
    6,
    'SMS',
    'PAYMENT_REMINDER',
    'NO_RESPONSE',
    SYSDATE
); 

SELECT *
FROM RECOVERY_CASE
WHERE case_id = 6;


#Because the customer didn't respond so we are updating channel to voice call for case_id=6

UPDATE RECOVERY_CASE
SET
    status = 'IN_PROGRESS',
    next_action = 'VOICE_CALL',
    next_action_time = SYSDATE
WHERE case_id = 6;

#Now we simulate voice call suppose person denied so we store that in CUSTOMER_INTERACTION.

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
    10,
    6,
    'VOICE',
    'HINGLISH',
    'Abhi payment nahi kar sakta, Friday ko kar dunga.',
    'PROMISE_TO_PAY'
);


SELECT *
FROM CUSTOMER_INTERACTION
WHERE case_id = 6;

#We also update in RECOVERY_ATTEMPT

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
    11,
    6,
    'VOICE',
    'PAYMENT_REMINDER',
    'PROMISED_TO_PAY',
    SYSDATE
);


#Now because customer has promised to pay so we need to change result.

UPDATE RECOVERY_CASE
SET
    status = 'PROMISED',
    next_action = 'FOLLOW_UP',
    next_action_time = SYSDATE + 3
WHERE case_id = 6;

#Now we see complete case history.

SELECT
    rc.case_id,
    rc.case_type,
    rc.status,
    rc.next_action,
    ra.channel,
    ra.action,
    ra.result,
    ra.attempt_time
FROM RECOVERY_CASE rc, RECOVERY_ATTEMPT ra
where rc.case_id = ra.case_id AND rc.case_id = 6
ORDER BY ra.attempt_time;
