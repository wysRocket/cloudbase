begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  phone text,
  country_code text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists user_roles_role_idx on public.user_roles (role);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = uid
      and ur.role = 'admin'
  );
$$;

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

create index if not exists payment_orders_user_id_idx
  on public.payment_orders (user_id, created_at desc);

create index if not exists payment_orders_status_idx
  on public.payment_orders (status, created_at desc);

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id);

create index if not exists credit_transactions_created_at_idx
  on public.credit_transactions (created_at desc);

drop trigger if exists payment_orders_set_updated_at on public.payment_orders;
create trigger payment_orders_set_updated_at
before update on public.payment_orders
for each row execute function public.set_updated_at();

alter table public.payment_orders enable row level security;
alter table public.payment_orders force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
alter table public.credit_transactions enable row level security;
alter table public.credit_transactions force row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
)
with check (
  id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists user_roles_select_own_or_admin on public.user_roles;
create policy user_roles_select_own_or_admin
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists credit_transactions_select_own_or_admin on public.credit_transactions;
create policy credit_transactions_select_own_or_admin
on public.credit_transactions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

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
drop policy if exists payment_orders_update_admin_only on public.payment_orders;
drop policy if exists payment_orders_delete_admin_only on public.payment_orders;

revoke all on table public.payment_orders from anon;
revoke all on table public.payment_orders from authenticated;
revoke all on table public.credit_transactions from anon;
revoke all on table public.credit_transactions from authenticated;
revoke all on table public.user_roles from anon;
revoke all on table public.user_roles from authenticated;
grant select on table public.payment_orders to authenticated;
grant select on table public.credit_transactions to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;
grant usage, select on sequence public.credit_transactions_id_seq to authenticated;

alter table public.credit_transactions
  add column if not exists payment_order_id uuid references public.payment_orders(id) on delete set null;

create unique index if not exists credit_transactions_payment_order_id_key
  on public.credit_transactions (payment_order_id)
  where payment_order_id is not null;

commit;
