-- Supabase credit transaction setup for Cloudbase
-- Run in Supabase SQL Editor or with: npx supabase db query --linked -f scripts/supabase-credit-transactions-setup.sql

begin;

create table if not exists public.credit_transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount integer not null,
  type text not null check (type in ('credit', 'debit')),
  status text not null default 'Completed',
  currency_paid text,
  currency text,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id);

create index if not exists credit_transactions_created_at_idx
  on public.credit_transactions (created_at desc);

alter table public.credit_transactions enable row level security;
alter table public.credit_transactions force row level security;

drop policy if exists credit_transactions_select_own_or_admin on public.credit_transactions;
create policy credit_transactions_select_own_or_admin
on public.credit_transactions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists credit_transactions_insert_own_or_admin on public.credit_transactions;
create policy credit_transactions_insert_own_or_admin
on public.credit_transactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists credit_transactions_update_admin_only on public.credit_transactions;
create policy credit_transactions_update_admin_only
on public.credit_transactions
for update
to authenticated
using ((select public.is_admin((select auth.uid()))))
with check ((select public.is_admin((select auth.uid()))));

drop policy if exists credit_transactions_delete_admin_only on public.credit_transactions;
create policy credit_transactions_delete_admin_only
on public.credit_transactions
for delete
to authenticated
using ((select public.is_admin((select auth.uid()))));

revoke all on table public.credit_transactions from anon;
revoke all on table public.credit_transactions from authenticated;
grant select, insert on table public.credit_transactions to authenticated;
grant usage, select on sequence public.credit_transactions_id_seq to authenticated;

commit;
