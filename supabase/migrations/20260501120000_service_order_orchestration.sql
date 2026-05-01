begin;

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'paid', 'provisioned', 'failed')),
  paid_at timestamptz,
  provisioned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_type text not null,
  service_name text not null,
  region text not null,
  amount_credits integer not null check (amount_credits > 0),
  display_price text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.service_resources (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid references public.order_items(id) on delete restrict,
  name text not null,
  service_type text not null,
  region text not null,
  price text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.service_resources
  alter column order_item_id set not null;

create table if not exists public.provision_events (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  service_resource_id uuid references public.service_resources(id) on delete set null,
  event_type text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists provision_events_order_id_created_at_idx on public.provision_events(order_id, created_at desc);

commit;
