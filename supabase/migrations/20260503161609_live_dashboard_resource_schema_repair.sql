create extension if not exists pgcrypto;

alter table public.credit_transactions
  add column if not exists sandbox_mode boolean not null default false,
  add column if not exists test_credit boolean not null default false,
  add column if not exists granted_by uuid references auth.users(id) on delete set null;

create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  provider text not null default 'digitalocean',
  provider_sku text not null,
  plan_code text not null unique,
  display_name text not null,
  region text not null,
  base_cost_cents integer not null default 0 check (base_cost_cents >= 0),
  sell_price_cents integer not null default 0 check (sell_price_cents >= 0),
  billing_cycle text not null default 'monthly',
  vcpu integer,
  memory_mb integer,
  storage_gb integer,
  gpu_model text,
  quota jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_item_id uuid,
  service_type text not null,
  provider text not null default 'digitalocean',
  provider_resource_id text,
  display_name text not null,
  status text not null default 'pending',
  region text not null,
  connection_details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provision_jobs (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.service_resources(id) on delete cascade,
  action text not null default 'provision',
  status text not null default 'queued',
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
  updated_at timestamptz not null default now()
);

create table if not exists public.provision_events (
  id bigserial primary key,
  job_id uuid references public.provision_jobs(id) on delete cascade,
  resource_id uuid references public.service_resources(id) on delete cascade,
  service_resource_id uuid references public.service_resources(id) on delete set null,
  order_id uuid,
  level text not null default 'info',
  event_type text,
  status text,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  provider_request_id text,
  created_at timestamptz not null default now()
);

create index if not exists service_catalog_active_type_idx
  on public.service_catalog (service_type, is_active)
  where is_active = true;
create index if not exists service_catalog_plan_region_idx
  on public.service_catalog (plan_code, region);
create index if not exists service_resources_user_created_at_idx
  on public.service_resources (user_id, created_at desc);
create index if not exists service_resources_user_status_idx
  on public.service_resources (user_id, status);
create index if not exists provision_jobs_resource_created_at_idx
  on public.provision_jobs (resource_id, created_at desc);
create index if not exists provision_jobs_status_next_run_idx
  on public.provision_jobs (status, next_run_at);
create unique index if not exists provision_jobs_resource_id_idempotency_key_key
  on public.provision_jobs (resource_id, idempotency_key);
create index if not exists provision_events_resource_created_at_idx
  on public.provision_events (resource_id, created_at desc);
create index if not exists provision_events_job_created_at_idx
  on public.provision_events (job_id, created_at desc);

alter table public.service_catalog enable row level security;
alter table public.service_catalog force row level security;
alter table public.service_resources enable row level security;
alter table public.service_resources force row level security;
alter table public.provision_jobs enable row level security;
alter table public.provision_jobs force row level security;
alter table public.provision_events enable row level security;
alter table public.provision_events force row level security;

drop policy if exists service_catalog_read_authenticated on public.service_catalog;
create policy service_catalog_read_authenticated
on public.service_catalog
for select
to authenticated
using (is_active = true or public.is_admin((select auth.uid())));

drop policy if exists service_resources_select_own_or_admin on public.service_resources;
create policy service_resources_select_own_or_admin
on public.service_resources
for select
to authenticated
using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists service_resources_insert_own on public.service_resources;
create policy service_resources_insert_own
on public.service_resources
for insert
to authenticated
with check (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists service_resources_update_own_or_admin on public.service_resources;
create policy service_resources_update_own_or_admin
on public.service_resources
for update
to authenticated
using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())))
with check (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists service_resources_delete_own_or_admin on public.service_resources;
create policy service_resources_delete_own_or_admin
on public.service_resources
for delete
to authenticated
using (user_id = (select auth.uid()) or public.is_admin((select auth.uid())));

drop policy if exists provision_jobs_select_own_or_admin on public.provision_jobs;
create policy provision_jobs_select_own_or_admin
on public.provision_jobs
for select
to authenticated
using (
  public.is_admin((select auth.uid()))
  or exists (
    select 1 from public.service_resources r
    where r.id = provision_jobs.resource_id
      and r.user_id = (select auth.uid())
  )
);

drop policy if exists provision_events_select_own_or_admin on public.provision_events;
create policy provision_events_select_own_or_admin
on public.provision_events
for select
to authenticated
using (
  public.is_admin((select auth.uid()))
  or exists (
    select 1 from public.service_resources r
    where (r.id = provision_events.resource_id or r.id = provision_events.service_resource_id)
      and r.user_id = (select auth.uid())
  )
);

revoke all on table public.service_catalog from anon, authenticated;
revoke all on table public.service_resources from anon, authenticated;
revoke all on table public.provision_jobs from anon, authenticated;
revoke all on table public.provision_events from anon, authenticated;

grant select on table public.service_catalog to authenticated;
grant select, insert, update, delete on table public.service_resources to authenticated;
grant select on table public.provision_jobs to authenticated;
grant select on table public.provision_events to authenticated;

grant select, insert, update, delete on table public.service_catalog to service_role;
grant select, insert, update, delete on table public.service_resources to service_role;
grant select, insert, update, delete on table public.provision_jobs to service_role;
grant select, insert, update, delete on table public.provision_events to service_role;
grant usage, select on sequence public.provision_events_id_seq to service_role;

grant select, insert, update on table public.credit_transactions to service_role;
grant usage, select on sequence public.credit_transactions_id_seq to service_role;

create or replace function public.deduct_credits_and_enqueue_provision(
  p_user_id uuid,
  p_resource_id uuid,
  p_idempotency_key text,
  p_amount integer,
  p_description text,
  out job_id uuid,
  out is_new boolean
)
returns record
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  select id into job_id
  from public.provision_jobs
  where idempotency_key = p_idempotency_key
    and resource_id = p_resource_id;

  if job_id is not null then
    is_new := false;
    return;
  end if;

  with locked_rows as (
    select amount from public.credit_transactions
    where user_id = p_user_id
    for update
  )
  select coalesce(sum(amount), 0) into v_balance from locked_rows;

  if v_balance < p_amount then
    raise exception 'insufficient_balance'
      using detail = format('balance=%s required=%s', v_balance, p_amount);
  end if;

  insert into public.provision_jobs (
    resource_id,
    action,
    idempotency_key,
    status,
    request_payload
  ) values (
    p_resource_id,
    'provision',
    p_idempotency_key,
    'queued',
    '{}'::jsonb
  )
  returning id into job_id;

  if p_amount > 0 then
    insert into public.credit_transactions (
      user_id,
      description,
      amount,
      type,
      status
    ) values (
      p_user_id,
      p_description,
      -p_amount,
      'debit',
      'completed'
    );
  end if;

  is_new := true;
end;
$$;

revoke all on function public.deduct_credits_and_enqueue_provision(uuid, uuid, text, integer, text) from public;
grant execute on function public.deduct_credits_and_enqueue_provision(uuid, uuid, text, integer, text) to service_role;

notify pgrst, 'reload schema';
