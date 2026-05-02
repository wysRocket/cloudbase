-- Reseller control plane schema for paid provisioning workflows.

create extension if not exists pgcrypto;

do $$ begin
  create type public.service_type as enum ('vps', 'kubernetes', 'gpu', 'database', 'game_server');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.billing_cycle as enum ('hourly', 'monthly', 'yearly');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('draft', 'pending_payment', 'paid', 'failed', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.resource_status as enum ('pending', 'provisioning', 'active', 'suspended', 'failed', 'deleting', 'deleted');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.job_status as enum ('queued', 'processing', 'succeeded', 'failed', 'dead_letter');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.event_level as enum ('info', 'warning', 'error');
exception when duplicate_object then null; end $$;


create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  service_type public.service_type not null,
  provider text not null default 'digitalocean',
  provider_sku text not null,
  plan_code text not null,
  display_name text not null,
  region text not null,
  base_cost_cents integer not null check (base_cost_cents >= 0),
  sell_price_cents integer not null check (sell_price_cents >= 0),
  billing_cycle public.billing_cycle not null,
  vcpu integer,
  memory_mb integer,
  storage_gb integer,
  gpu_model text,
  quota jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_sku, region),
  unique (plan_code)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.order_status not null default 'draft',
  currency text not null default 'USD',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  payment_session_id text,
  payment_provider text,
  payment_confirmed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_catalog_id uuid not null references public.service_catalog(id),
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.service_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  service_type public.service_type not null,
  provider text not null default 'digitalocean',
  provider_resource_id text,
  display_name text not null,
  status public.resource_status not null default 'pending',
  region text not null,
  connection_details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provision_jobs (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.service_resources(id) on delete cascade,
  action text not null check (action in ('provision', 'sync_status', 'suspend', 'resume', 'resize', 'delete')),
  status public.job_status not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  idempotency_key text not null,
  next_run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists public.provision_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.provision_jobs(id) on delete cascade,
  resource_id uuid not null references public.service_resources(id) on delete cascade,
  level public.event_level not null default 'info',
  event_type text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_service_catalog_active_type on public.service_catalog (service_type, is_active) where is_active = true;
create index if not exists idx_orders_user_created_at on public.orders (user_id, created_at desc);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_resources_user_status on public.service_resources (user_id, status);
create index if not exists idx_provision_jobs_status_next_run on public.provision_jobs (status, next_run_at);
create index if not exists idx_provision_jobs_resource on public.provision_jobs (resource_id, created_at desc);
create index if not exists idx_provision_events_resource_created on public.provision_events (resource_id, created_at desc);

alter table public.service_catalog enable row level security;
alter table public.service_catalog force row level security;
alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.order_items enable row level security;
alter table public.order_items force row level security;
alter table public.service_resources enable row level security;
alter table public.service_resources force row level security;
alter table public.provision_jobs enable row level security;
alter table public.provision_jobs force row level security;
alter table public.provision_events enable row level security;
alter table public.provision_events force row level security;

-- set_updated_at triggers for tables that have an updated_at column
drop trigger if exists set_service_catalog_updated_at on public.service_catalog;
create trigger set_service_catalog_updated_at
  before update on public.service_catalog
  for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists set_service_resources_updated_at on public.service_resources;
create trigger set_service_resources_updated_at
  before update on public.service_resources
  for each row execute function public.set_updated_at();

drop trigger if exists set_provision_jobs_updated_at on public.provision_jobs;
create trigger set_provision_jobs_updated_at
  before update on public.provision_jobs
  for each row execute function public.set_updated_at();

-- Revoke all default privileges and grant minimal access to anon/authenticated
revoke all on table public.service_catalog from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.service_resources from anon, authenticated;
revoke all on table public.provision_jobs from anon, authenticated;
revoke all on table public.provision_events from anon, authenticated;

-- authenticated users: read-only for catalog; read + insert for orders/items/resources; read-only for jobs/events
grant select on table public.service_catalog to authenticated;
grant select, insert on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select, insert on table public.service_resources to authenticated;
grant select on table public.provision_jobs to authenticated;
grant select on table public.provision_events to authenticated;

-- service_role needs full access for Edge Functions (createAdminClient bypasses RLS but still needs table grants)
grant select, insert, update, delete on table public.service_catalog to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;
grant select, insert, update, delete on table public.service_resources to service_role;
grant select, insert, update, delete on table public.provision_jobs to service_role;
grant select, insert, update, delete on table public.provision_events to service_role;

-- RLS policies

create policy "service_catalog_readable_by_authenticated"
  on public.service_catalog
  for select
  to authenticated
  using (is_active = true);

-- Orders: users can read their own orders and create new ones (status/payment fields are server-controlled)
create policy "orders_readable_by_owner"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "orders_insertable_by_owner"
  on public.orders
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Order items: users can read items belonging to their own orders; inserts and mutations are server-side only
create policy "order_items_readable_via_order"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- Service resources: users can read their own and create new ones;
-- status/provider_resource_id/connection_details are managed by backend workers only
create policy "resources_readable_by_owner"
  on public.service_resources
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "resources_insertable_by_owner"
  on public.service_resources
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "provision_jobs_owned_via_resource"
  on public.provision_jobs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.service_resources r
      where r.id = provision_jobs.resource_id
        and r.user_id = auth.uid()
    )
  );

create policy "provision_events_owned_via_resource"
  on public.provision_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.service_resources r
      where r.id = provision_events.resource_id
        and r.user_id = auth.uid()
    )
  );

