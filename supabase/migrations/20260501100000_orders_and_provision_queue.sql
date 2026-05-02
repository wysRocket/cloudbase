begin;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'provisioning', 'completed', 'failed', 'cancelled')),
  total_credits integer not null check (total_credits >= 0),
  currency text,
  sku_lock_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sku text not null,
  region text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_credits integer not null check (unit_credits >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'provisioning', 'provisioned', 'failed')),
  resource_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provision_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed', 'retrying')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  available_at timestamptz not null default now(),
  last_error text,
  provider_request jsonb,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provision_events (
  id bigserial primary key,
  job_id uuid not null references public.provision_jobs(id) on delete cascade,
  status text not null,
  message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index if not exists orders_payment_order_id_idx on public.orders (payment_order_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_sku_status_idx on public.order_items (sku, status);
create index if not exists provision_jobs_status_available_at_idx on public.provision_jobs (status, available_at);
create index if not exists provision_jobs_order_item_id_idx on public.provision_jobs (order_item_id);
create index if not exists provision_events_job_id_created_at_idx on public.provision_events (job_id, created_at desc);

create unique index if not exists order_items_sku_active_reservation_key
  on public.order_items (sku)
  where status in ('reserved', 'provisioning') and (resource_ref is null or resource_ref = '');

alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.order_items enable row level security;
alter table public.order_items force row level security;
alter table public.provision_jobs enable row level security;
alter table public.provision_jobs force row level security;
alter table public.provision_events enable row level security;
alter table public.provision_events force row level security;

drop policy if exists orders_select_own_or_admin on public.orders;
create policy orders_select_own_or_admin
on public.orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists order_items_select_own_or_admin on public.order_items;
create policy order_items_select_own_or_admin
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.user_id = (select auth.uid())
        or (select public.is_admin((select auth.uid())))
      )
  )
);

drop policy if exists provision_jobs_select_own_or_admin on public.provision_jobs;
create policy provision_jobs_select_own_or_admin
on public.provision_jobs
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists provision_events_select_own_or_admin on public.provision_events;
create policy provision_events_select_own_or_admin
on public.provision_events
for select
to authenticated
using (
  exists (
    select 1
    from public.provision_jobs pj
    where pj.id = provision_events.job_id
      and (
        pj.user_id = (select auth.uid())
        or (select public.is_admin((select auth.uid())))
      )
  )
);

revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.provision_jobs from anon, authenticated;
revoke all on table public.provision_events from anon, authenticated;
grant select on table public.orders, public.order_items, public.provision_jobs, public.provision_events to authenticated;

grant select, insert, update on table public.orders to service_role;
grant select, insert, update on table public.order_items to service_role;
grant select, insert, update on table public.provision_jobs to service_role;
grant select, insert, update on table public.provision_events to service_role;
grant usage, select on sequence public.provision_events_id_seq to service_role;

commit;
