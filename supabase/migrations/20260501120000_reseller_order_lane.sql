create extension if not exists pgcrypto;

create table if not exists public.reseller_skus (
  sku text primary key,
  display_name text not null,
  price_minor integer not null check (price_minor > 0),
  currency text not null default 'USD',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','paid','failed','canceled')),
  total_minor integer not null check (total_minor > 0),
  currency text not null,
  payment_session jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sku text not null references public.reseller_skus(sku),
  region text not null,
  unit_price_minor integer not null check (unit_price_minor > 0),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.service_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete restrict,
  sku text not null,
  region text not null,
  status text not null default 'queued' check (status in ('queued','provisioning','active','failed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.provision_jobs (
  id uuid primary key default gen_random_uuid(),
  service_resource_id uuid not null references public.service_resources(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.enqueue_provision_jobs_for_order(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_jobs integer := 0;
begin
  if not exists (select 1 from public.orders o where o.id = p_order_id and o.status = 'paid') then
    raise exception 'order_not_paid';
  end if;

  with created_resources as (
    insert into public.service_resources (user_id, order_item_id, sku, region, status)
    select o.user_id, oi.id, oi.sku, oi.region, 'queued'
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = p_order_id
      and not exists (
        select 1 from public.service_resources sr where sr.order_item_id = oi.id
      )
    returning id, order_item_id
  ), created_jobs as (
    insert into public.provision_jobs (service_resource_id, status, payload)
    select cr.id, 'queued', jsonb_build_object('order_item_id', cr.order_item_id)
    from created_resources cr
    returning id
  )
  select count(*)::integer into inserted_jobs from created_jobs;

  return inserted_jobs;
end;
$$;

alter table public.service_resources
  alter column order_item_id set not null;

grant execute on function public.enqueue_provision_jobs_for_order(uuid) to service_role;
grant select, insert, update on public.orders to service_role;
grant select, insert, update on public.order_items to service_role;
grant select, insert, update on public.service_resources to service_role;
grant select, insert, update on public.provision_jobs to service_role;
grant select on public.reseller_skus to service_role;
