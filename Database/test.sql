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

SELECT
    case_id,
    status,
    next_action,
    TO_CHAR(
        next_action_time,
        'DD-MON-YYYY HH24:MI:SS'
    ) AS follow_up_time
FROM RECOVERY_CASE
WHERE case_id = 1;