begin;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice text not null unique,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','failed','cancelled')),
  provider_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  plan_code text not null,
  region_code text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount_minor integer not null check (unit_amount_minor > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.provider_provision_queue (
  id bigserial primary key,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  provider text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','done','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.service_resources (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  resource_ref text,
  created_at timestamptz not null default now()
);

-- prevent service resources from being created without paid order linkage
create or replace function public.ensure_paid_order_item_for_service_resource()
returns trigger
language plpgsql
as $$
declare
  current_order_status text;
begin
  if new.order_item_id is null then
    raise exception 'service_resources.order_item_id is required';
  end if;

  select o.status
  into current_order_status
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = new.order_item_id;

  if current_order_status is distinct from 'paid' then
    raise exception 'service_resources requires a paid order item';
  end if;

  return new;
end;
$$;

drop trigger if exists service_resources_requires_paid_order on public.service_resources;
create trigger service_resources_requires_paid_order
before insert or update on public.service_resources
for each row execute function public.ensure_paid_order_item_for_service_resource();

-- remove direct-null path once orchestration is live
alter table public.service_resources
  alter column order_item_id set not null;

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists orders_user_status_idx on public.orders(user_id, status, created_at desc);

commit;
