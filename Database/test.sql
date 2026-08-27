-- CREATE USER revrec IDENTIFIED BY revrec123;

-- GRANT CONNECT, RESOURCE TO revrec;

-- ALTER USER revrec QUOTA UNLIMITED ON USERS;

-- SELECT username
-- FROM all_users
-- WHERE username = 'REVREC';

-- GRANT CREATE VIEW TO revrec;

-- SELECT
--     case_id,
--     case_type,
--     status,
--     risk_score,
--     next_action,
--     next_action_time
-- FROM RECOVERY_CASE
-- WHERE case_id = 1;

-- SELECT
--     case_id,
--     status,
--     next_action,
--     TO_CHAR(
--         next_action_time,
--         'DD-MON-YYYY HH24:MI:SS'
--     ) AS follow_up_time
-- FROM RECOVERY_CASE
-- WHERE case_id = 1;



-- UPDATE RECOVERY_CASE
-- SET status = 'PROMISED',
--     next_action = 'FOLLOW_UP',
--     next_action_time = SYSDATE - 1
-- WHERE case_id = 1;

-- INSERT INTO PAYMENT
-- (
--     payment_id,
--     customer_id,
--     order_id,
--     subscription_id,
--     amount,
--     status,
--     failure_reason,
--     payment_time
-- )
-- VALUES
-- (
--     9010,
--     1,
--     NULL,
--     501,
--     999,
--     'SUCCESS',
--     NULL,
--     SYSDATE
-- );

-- -- COMMIT;

-- UPDATE RECOVERY_CASE
-- SET status = 'PROMISED',
--     next_action = 'FOLLOW_UP',
--     next_action_time = SYSDATE - 1
-- WHERE case_id = 1;

-- COMMIT;

-- SELECT MAX(attempt_id) AS max_attempt_id
-- FROM RECOVERY_ATTEMPT;
SELECT sequence_name,
       last_number,
       increment_by
FROM user_sequences
WHERE sequence_name = 'RECOVERY_ATTEMPT_SEQ';

SELECT MAX(attempt_id)
FROM RECOVERY_ATTEMPT;

DROP SEQUENCE recovery_attempt_seq;

CREATE SEQUENCE recovery_attempt_seq
START WITH 17
INCREMENT BY 1
NOCACHE;


SELECT sequence_name,
       last_number
FROM user_sequences
WHERE sequence_name = 'RECOVERY_ATTEMPT_SEQ';