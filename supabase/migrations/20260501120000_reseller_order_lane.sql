create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  state text not null default 'pending_payment',
  amount_minor integer not null,
  currency text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sku text not null,
  region text not null,
  description text,
  amount_minor integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  sku text not null,
  region text not null,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists public.provision_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  service_resource_id uuid not null references public.service_resources(id) on delete cascade,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

alter table public.payment_orders add column if not exists external_reference uuid;
alter table public.service_resources alter column order_item_id set not null;

grant select, insert, update on table public.orders to service_role;
grant select, insert, update on table public.order_items to service_role;
grant select, insert, update on table public.service_resources to service_role;
grant select, insert, update on table public.provision_jobs to service_role;
