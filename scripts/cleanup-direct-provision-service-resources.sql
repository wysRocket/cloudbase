-- Preview rows that will be deleted.
select id, user_id, order_item_id, status, created_at
from public.service_resources
where order_item_id is null
order by created_at asc;

-- Delete direct-provision era rows (no order item link).
delete from public.service_resources
where order_item_id is null;
