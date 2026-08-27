INSERT INTO CUSTOMER
(customer_id, name, phone, email, preferred_language)
VALUES
(1, 'Rahul Sharma', '9876543210', 'rahul@gmail.com', 'HINGLISH');

INSERT INTO CUSTOMER
(customer_id, name, phone, email, preferred_language)
VALUES
(2, 'Priya Singh', '9876543211', 'priya@gmail.com', 'ENGLISH');

INSERT INTO CUSTOMER
(customer_id, name, phone, email, preferred_language)
VALUES
(3, 'Aman Verma', '9876543212', 'aman@gmail.com', 'HINGLISH');

INSERT INTO CUSTOMER
(customer_id, name, phone, email, preferred_language)
VALUES
(4, 'Neha Gupta', '9876543213', 'neha@gmail.com', 'ENGLISH');

INSERT INTO CUSTOMER
(customer_id, name, phone, email, preferred_language)
VALUES
(5, 'Rohit Kumar', '9876543214', 'rohit@gmail.com', 'HINGLISH');




INSERT INTO CUSTOMER_ORDER
(order_id, customer_id, amount, status, created_at)
VALUES
(101, 1, 1999.00, 'PENDING', SYSDATE - 2);

INSERT INTO CUSTOMER_ORDER
(order_id, customer_id, amount, status, created_at)
VALUES
(102, 2, 2499.00, 'PAID', SYSDATE - 3);

INSERT INTO CUSTOMER_ORDER
(order_id, customer_id, amount, status, created_at)
VALUES
(103, 3, 1499.00, 'PENDING', SYSDATE - 1);

INSERT INTO CUSTOMER_ORDER
(order_id, customer_id, amount, status, created_at)
VALUES
(104, 4, 999.00, 'PAID', SYSDATE - 4);

INSERT INTO CUSTOMER_ORDER
(order_id, customer_id, amount, status, created_at)
VALUES
(105, 5, 2999.00, 'PENDING', SYSDATE - 1);



INSERT INTO CHECKOUT_SESSION
(checkout_id, customer_id, order_id, started_at, completed_at, status)
VALUES
(1001, 1, 101, SYSDATE - 2, NULL, 'ABANDONED');

INSERT INTO CHECKOUT_SESSION
(checkout_id, customer_id, order_id, started_at, completed_at, status)
VALUES
(1002, 2, 102, SYSDATE - 3, SYSDATE - 3 + (1/24), 'COMPLETED');

INSERT INTO CHECKOUT_SESSION
(checkout_id, customer_id, order_id, started_at, completed_at, status)
VALUES
(1003, 3, 103, SYSDATE - 1, NULL, 'ABANDONED');

INSERT INTO CHECKOUT_SESSION
(checkout_id, customer_id, order_id, started_at, completed_at, status)
VALUES
(1004, 4, 104, SYSDATE - 4, SYSDATE - 4 + (2/24), 'COMPLETED');

INSERT INTO CHECKOUT_SESSION
(checkout_id, customer_id, order_id, started_at, completed_at, status)
VALUES
(1005, 5, 105, SYSDATE - 1, NULL, 'ABANDONED');



INSERT INTO SUBSCRIPTION
(subscription_id, customer_id, amount, next_billing_date, status)
VALUES
(501, 1, 999.00, SYSDATE + 20, 'ACTIVE');

INSERT INTO SUBSCRIPTION
(subscription_id, customer_id, amount, next_billing_date, status)
VALUES
(502, 2, 1499.00, SYSDATE + 15, 'ACTIVE');

INSERT INTO SUBSCRIPTION
(subscription_id, customer_id, amount, next_billing_date, status)
VALUES
(503, 3, 799.00, SYSDATE + 10, 'ACTIVE');

INSERT INTO SUBSCRIPTION
(subscription_id, customer_id, amount, next_billing_date, status)
VALUES
(504, 4, 1999.00, SYSDATE + 25, 'ACTIVE');

INSERT INTO SUBSCRIPTION
(subscription_id, customer_id, amount, next_billing_date, status)
VALUES
(505, 5, 599.00, SYSDATE + 5, 'FAILED');


-- #unsuccessful

INSERT INTO PAYMENT
(payment_id, customer_id, order_id, subscription_id,
 amount, status, failure_reason, payment_time)
VALUES
(9001, 1, NULL, 501,
 999.00, 'FAILED', 'BANK_DECLINED', SYSDATE - 1);

INSERT INTO PAYMENT
(payment_id, customer_id, order_id, subscription_id,
 amount, status, failure_reason, payment_time)
VALUES
(9003, 3, NULL, 503,
 799.00, 'FAILED', 'INSUFFICIENT_FUNDS', SYSDATE - 1);


INSERT INTO PAYMENT
(payment_id, customer_id, order_id, subscription_id,
 amount, status, failure_reason, payment_time)
VALUES
(9005, 5, NULL, 505,
 599.00, 'FAILED', 'CARD_EXPIRED', SYSDATE - 1);


-- #successful
INSERT INTO PAYMENT
(payment_id, customer_id, order_id, subscription_id,
 amount, status, failure_reason, payment_time)
VALUES
(9002, 2, NULL, 502,
 1499.00, 'SUCCESS', NULL, SYSDATE - 2);


INSERT INTO PAYMENT
(payment_id, customer_id, order_id, subscription_id,
 amount, status, failure_reason, payment_time)
VALUES
(9004, 4, 104, NULL,
 999.00, 'SUCCESS', NULL, SYSDATE - 4);



-- #Agent part

INSERT INTO RECOVERY_CASE
(case_id, customer_id, payment_id, checkout_id,
 case_type, status, risk_score, next_action, next_action_time)
VALUES
(1, 1, 9001, NULL,
 'SUBSCRIPTION_FAILURE',
 'OPEN', 85,
 'RETRY_PAYMENT', SYSDATE);

INSERT INTO RECOVERY_CASE
(case_id, customer_id, payment_id, checkout_id,
 case_type, status, risk_score, next_action, next_action_time)
VALUES
(2, 3, 9003, NULL,
 'SUBSCRIPTION_FAILURE',
 'OPEN', 90,
 'VOICE_CALL', SYSDATE);

INSERT INTO RECOVERY_CASE
(case_id, customer_id, payment_id, checkout_id,
 case_type, status, risk_score, next_action, next_action_time)
VALUES
(3, 5, 9005, NULL,
 'SUBSCRIPTION_FAILURE',
 'OPEN', 75,
 'SEND_REMINDER', SYSDATE);

INSERT INTO RECOVERY_CASE
(case_id, customer_id, payment_id, checkout_id,
 case_type, status, risk_score, next_action, next_action_time)
VALUES
(4, 1, NULL, 1001,
 'CHECKOUT_ABANDONMENT',
 'OPEN', 70,
 'SEND_REMINDER', SYSDATE);

INSERT INTO RECOVERY_CASE
(case_id, customer_id, payment_id, checkout_id,
 case_type, status, risk_score, next_action, next_action_time)
VALUES
(5, 3, NULL, 1003,
 'CHECKOUT_ABANDONMENT',
 'OPEN', 65,
 'VOICE_CALL', SYSDATE);


INSERT INTO RECOVERY_CASE
(case_id, customer_id, payment_id, checkout_id,
 case_type, status, risk_score, next_action, next_action_time)
VALUES
(6, 5, NULL, 1005,
 'CHECKOUT_ABANDONMENT',
 'OPEN', 80,
 'SEND_REMINDER', SYSDATE);




-- #Recovery Reminder

INSERT INTO RECOVERY_ATTEMPT
(attempt_id, case_id, channel, action, result, attempt_time)
VALUES
(1, 1, 'SMS', 'PAYMENT_REMINDER', 'NO_RESPONSE', SYSDATE - 1);


INSERT INTO RECOVERY_ATTEMPT
(attempt_id, case_id, channel, action, result, attempt_time)
VALUES
(2, 2, 'VOICE', 'PAYMENT_REMINDER', 'PROMISED_TO_PAY', SYSDATE - 1);


INSERT INTO RECOVERY_ATTEMPT
(attempt_id, case_id, channel, action, result, attempt_time)
VALUES
(3, 4, 'EMAIL', 'CHECKOUT_REMINDER', 'NO_RESPONSE', SYSDATE - 1);



-- #Hinglish conversations

INSERT INTO CUSTOMER_INTERACTION
(interaction_id, case_id, channel, language,
 customer_message, detected_intent)
VALUES
(1, 2, 'VOICE', 'HINGLISH',
 'Abhi payment nahi kar sakta, Friday ko kar dunga.',
 'PROMISE_TO_PAY');


INSERT INTO CUSTOMER_INTERACTION
(interaction_id, case_id, channel, language,
 customer_message, detected_intent)
VALUES
(2, 4, 'VOICE', 'HINGLISH',
 'Haan, payment link bhej do.',
 'PAY_NOW');


commit;
SELECT * FROM CUSTOMER;



