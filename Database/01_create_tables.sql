CREATE TABLE CUSTOMER (
    customer_id NUMBER PRIMARY KEY,
    name VARCHAR2(100) NOT NULL,
    phone VARCHAR2(15),
    email VARCHAR2(100),
    preferred_language VARCHAR2(20)
);

-- #In CUSTOMER table customer_id is my primary key.

CREATE TABLE CUSTOMER_ORDER (
    order_id NUMBER PRIMARY KEY,
    customer_id NUMBER NOT NULL,
    amount NUMBER(10,2) NOT NULL,
    status VARCHAR2(30),
    created_at DATE DEFAULT SYSDATE,

    CONSTRAINT fk_order_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
);

-- #In CUSTOMER_ORDER table order_id is my primary key and customer_id is my foreign key. So it establishes a 1:n relationship.

CREATE TABLE CHECKOUT_SESSION (
    checkout_id NUMBER PRIMARY KEY,
    customer_id NUMBER NOT NULL,
    order_id NUMBER,
    started_at DATE DEFAULT SYSDATE,
    completed_at DATE,
    status VARCHAR2(30),

    CONSTRAINT fk_checkout_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id),

    CONSTRAINT fk_checkout_order
        FOREIGN KEY (order_id)
        REFERENCES CUSTOMER_ORDER(order_id)
);

-- #Here both customer_id and order_id are foreign keys and order_id is primary key.

CREATE TABLE SUBSCRIPTION (
    subscription_id NUMBER PRIMARY KEY,
    customer_id NUMBER NOT NULL,
    amount NUMBER(10,2) NOT NULL,
    next_billing_date DATE,
    status VARCHAR2(30),

    CONSTRAINT fk_subscription_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
);

-- #customer_id is my foreign key and. subscription id is primary key.

CREATE TABLE PAYMENT (
    payment_id NUMBER PRIMARY KEY,
    customer_id NUMBER NOT NULL,
    order_id NUMBER,
    subscription_id NUMBER,
    amount NUMBER(10,2) NOT NULL,
    status VARCHAR2(30),
    failure_reason VARCHAR2(200),
    payment_time DATE,

    CONSTRAINT fk_payment_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id),

    CONSTRAINT fk_payment_order
        FOREIGN KEY (order_id)
        REFERENCES CUSTOMER_ORDER(order_id),

    CONSTRAINT fk_payment_subscription
        FOREIGN KEY (subscription_id)
        REFERENCES SUBSCRIPTION(subscription_id)
);

-- #customer_id, order_id and subscription_id is my foreign key and payment_id is my primary key.

-- #This is heart of our database. This table comes into play when system detects revenue is at risk.

CREATE TABLE RECOVERY_CASE (
    case_id NUMBER PRIMARY KEY,
    customer_id NUMBER NOT NULL,
    payment_id NUMBER,
    checkout_id NUMBER,
    case_type VARCHAR2(40),
    status VARCHAR2(30),
    risk_score NUMBER(5,2),
    next_action VARCHAR2(50),
    next_action_time DATE,
    created_at DATE DEFAULT SYSDATE,

    CONSTRAINT fk_case_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id),

    CONSTRAINT fk_case_payment
        FOREIGN KEY (payment_id)
        REFERENCES PAYMENT(payment_id),

    CONSTRAINT fk_case_checkout
        FOREIGN KEY (checkout_id)
        REFERENCES CHECKOUT_SESSION(checkout_id)
);

-- # customer_id, payment_id and checkout_id are foreign keys and case_id is primary key.


CREATE TABLE RECOVERY_ATTEMPT (
    attempt_id NUMBER PRIMARY KEY,
    case_id NUMBER NOT NULL,
    channel VARCHAR2(30),
    action VARCHAR2(50),
    result VARCHAR2(50),
    attempt_time DATE DEFAULT SYSDATE,

    CONSTRAINT fk_attempt_case
        FOREIGN KEY (case_id)
        REFERENCES RECOVERY_CASE(case_id)
);

-- #This table is made as a recovery case can have multiple attempts.
-- #case_id is foreign kay and attempt_id is primary key.

CREATE TABLE CUSTOMER_INTERACTION (
    interaction_id NUMBER PRIMARY KEY,
    case_id NUMBER NOT NULL,
    channel VARCHAR2(30),
    language VARCHAR2(20),
    customer_message VARCHAR2(1000),
    detected_intent VARCHAR2(50),
    interaction_time DATE DEFAULT SYSDATE,

    CONSTRAINT fk_interaction_case
        FOREIGN KEY (case_id)
        REFERENCES RECOVERY_CASE(case_id)
);

-- #This is for voice agent.
-- #case_id is forign key and interaction_id is my primary key.

desc CHECKOUT_SESSION;