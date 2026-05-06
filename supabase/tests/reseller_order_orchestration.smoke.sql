-- smoke: create pending order + item, verify provisioning gate fails and paid gate succeeds
--
-- Run this file AFTER migrations have been applied, e.g.:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--       -f supabase/tests/reseller_order_orchestration.smoke.sql
--
-- The script runs inside a single transaction that is rolled back at the end,
-- so it leaves no persistent test data in the database.

begin;

-- Insert a deterministic test user so foreign-key constraints on user_id are satisfied.
-- auth.uid() is NULL in a raw SQL context outside the Supabase auth layer, so a known
-- UUID is used instead.
insert into auth.users (
  id, instance_id,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role,
  confirmation_token, recovery_token,
  email_change_token_new, email_change
)
values (
  '00000000-0000-0000-0000-000000000099'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'smoke-test@cloudbase.test',
  crypt('smoke-password-123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  'authenticated', 'authenticated',
  '', '', '', ''
)
on conflict (id) do nothing;

-- Create a pending order and its line item.
with new_order as (
  insert into public.orders (user_id, invoice, amount_minor, currency, status)
  values (
    '00000000-0000-0000-0000-000000000099'::uuid,
    'SMOKE-RSL-1',
    1000,
    'USD',
    'pending_payment'
  )
  returning id
), new_item as (
  insert into public.order_items (order_id, plan_code, region_code, quantity, unit_amount_minor)
  select id, 'starter', 'us-east', 1, 1000 from new_order
  returning id
)
select id from new_item;

-- Verify the provisioning gate BLOCKS inserts while the order is still pending_payment.
-- The trigger ensure_paid_order_item_for_service_resource must raise an exception here.
do $$
begin
  insert into public.service_resources (order_item_id, user_id, provider)
  select oi.id, '00000000-0000-0000-0000-000000000099'::uuid, 'smoke-provider'
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.invoice = 'SMOKE-RSL-1';

  -- If the insert succeeded the gate is broken – fail the smoke test.
  raise exception 'smoke FAIL: provisioning gate should have blocked a pending_payment order but did not';
exception
  when others then
    if sqlerrm like '%service_resources requires a paid order item%' then
      raise notice 'smoke PASS: provisioning gate correctly blocked pending_payment order';
    else
      raise;
    end if;
end $$;

-- Mark the order as paid.
update public.orders set status = 'paid' where invoice = 'SMOKE-RSL-1';

-- Verify the provisioning gate ALLOWS inserts once the order is paid.
insert into public.service_resources (order_item_id, user_id, provider)
select oi.id, '00000000-0000-0000-0000-000000000099'::uuid, 'smoke-provider'
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.invoice = 'SMOKE-RSL-1';

do $$ begin raise notice 'smoke PASS: provisioning gate allowed insert for paid order'; end $$;

-- Roll back all test data so the database is left in a clean state.
rollback;
