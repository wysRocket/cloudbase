-- smoke: create pending order + item, verify provisioning gate fails and paid gate succeeds

with new_order as (
  insert into public.orders (user_id, invoice, amount_minor, currency, status)
  values (auth.uid(), 'SMOKE-RSL-1', 1000, 'USD', 'pending_payment')
  returning id
), new_item as (
  insert into public.order_items (order_id, plan_code, region_code, quantity, unit_amount_minor)
  select id, 'starter', 'us-east', 1, 1000 from new_order
  returning id
)
select id from new_item;

-- should fail until order status becomes paid
insert into public.service_resources (order_item_id, user_id, provider)
select oi.id, auth.uid(), 'smoke-provider'
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.invoice = 'SMOKE-RSL-1';

update public.orders set status = 'paid' where invoice = 'SMOKE-RSL-1';

-- should now pass
insert into public.service_resources (order_item_id, user_id, provider)
select oi.id, auth.uid(), 'smoke-provider'
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.invoice = 'SMOKE-RSL-1';
