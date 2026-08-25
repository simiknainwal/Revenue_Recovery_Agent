
#Join commands to display abandoned checkouts.

SELECT c.name,
       co.order_id,
       co.amount,
       cs.status
FROM CUSTOMER c,CUSTOMER_ORDER co,CHECKOUT_SESSION cs
where c.customer_id = co.customer_id AND
      co.order_id = cs.order_id AND
      cs.status = 'ABANDONED';


#Failed subscriptions.


SELECT c.name,
       s.subscription_id,
       p.amount,
       p.status,
       p.failure_reason
FROM CUSTOMER c,SUBSCRIPTION s,PAYMENT p
    WHERE c.customer_id = s.customer_id
 AND s.subscription_id = p.subscription_id
 AND p.status = 'FAILED';

 
#Join commands to display abandoned checkouts.

SELECT c.name,
       co.order_id,
       co.amount,
       cs.status
FROM CUSTOMER c,CUSTOMER_ORDER co,CHECKOUT_SESSION cs
where c.customer_id = co.customer_id AND
      co.order_id = cs.order_id AND
      cs.status = 'ABANDONED';


#Failed subscriptions.


SELECT c.name,
       s.subscription_id,
       p.amount,
       p.status,
       p.failure_reason
FROM CUSTOMER c,SUBSCRIPTION s,PAYMENT p
    WHERE c.customer_id = s.customer_id
 AND s.subscription_id = p.subscription_id
 AND p.status = 'FAILED';

# Calculate revenue at risk.

select sum(co.amount) as checkout_revenue_ar_risk
from CUSTOMER_ORDER co, CHECKOUT_SESSION cs
where co.order_id=cs.order_id AND cs.status='ABANDONED'


#Failed subscription revenue.

select sum(p.amount) as subscription_revenue_at_risk
from PAYMENT p
where p.status='FAILED' AND p.subscription_id is not NULL
