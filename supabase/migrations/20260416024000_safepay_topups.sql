begin;

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists country_code text,
  add column if not exists city text;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice text not null unique,
  provider_transaction_id text,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency in ('EUR', 'GBP')),
  credits_to_add integer not null check (credits_to_add >= 0),
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed', 'manual_review')),
  provider_status_id integer,
  provider_status_text text,
  description text not null,
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_country_code text not null,
  customer_city text not null,
  raw_create_response text,
  raw_status_response jsonb,
  last_checked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_orders_user_id_idx
  on public.payment_orders (user_id, created_at desc);

create index if not exists payment_orders_status_idx
  on public.payment_orders (status, created_at desc);

drop trigger if exists payment_orders_set_updated_at on public.payment_orders;
create trigger payment_orders_set_updated_at
before update on public.payment_orders
for each row execute function public.set_updated_at();

alter table public.payment_orders enable row level security;
alter table public.payment_orders force row level security;

drop policy if exists payment_orders_select_own_or_admin on public.payment_orders;
create policy payment_orders_select_own_or_admin
on public.payment_orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists payment_orders_insert_admin_only on public.payment_orders;
create policy payment_orders_insert_admin_only
on public.payment_orders
for insert
to authenticated
with check ((select public.is_admin((select auth.uid()))));

drop policy if exists payment_orders_update_admin_only on public.payment_orders;
create policy payment_orders_update_admin_only
on public.payment_orders
for update
to authenticated
using ((select public.is_admin((select auth.uid()))))
with check ((select public.is_admin((select auth.uid()))));

drop policy if exists payment_orders_delete_admin_only on public.payment_orders;
create policy payment_orders_delete_admin_only
on public.payment_orders
for delete
to authenticated
using ((select public.is_admin((select auth.uid()))));

revoke all on table public.payment_orders from anon;
revoke all on table public.payment_orders from authenticated;
grant select on table public.payment_orders to authenticated;

alter table public.credit_transactions
  add column if not exists payment_order_id uuid references public.payment_orders(id) on delete set null;

create unique index if not exists credit_transactions_payment_order_id_key
  on public.credit_transactions (payment_order_id)
  where payment_order_id is not null;

commit;
