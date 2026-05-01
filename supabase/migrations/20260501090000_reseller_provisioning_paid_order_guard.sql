begin;

-- Status contract: provisioning may only proceed for paid orders.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'order_payment_status'
      and n.nspname = 'public'
  ) then
    create type public.order_payment_status as enum ('pending', 'paid', 'failed', 'cancelled');
  end if;
end $$;

create table if not exists public.reseller_orders (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references auth.users(id) on delete cascade,
  status public.order_payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provider_provision_jobs (
  id bigserial primary key,
  reseller_id uuid not null references auth.users(id) on delete cascade,
  provider_slug text not null,
  payload jsonb not null,
  order_id uuid not null references public.reseller_orders(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists provider_provision_jobs_order_id_idx
  on public.provider_provision_jobs (order_id);

create or replace function public.reseller_order_must_be_paid()
returns trigger
language plpgsql
as $$
declare
  v_status public.order_payment_status;
begin
  select ro.status into v_status
  from public.reseller_orders ro
  where ro.id = new.order_id;

  if v_status is null then
    raise exception using
      errcode = 'P0001',
      message = 'Provisioning order linkage is missing or invalid',
      detail = 'error_code=PROVISION_ORDER_LINK_MISSING';
  end if;

  if v_status <> 'paid' then
    raise exception using
      errcode = 'P0001',
      message = 'Provisioning order must be paid before queueing',
      detail = 'error_code=PROVISION_ORDER_NOT_PAID';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_provider_provision_jobs_paid_guard on public.provider_provision_jobs;
create trigger trg_provider_provision_jobs_paid_guard
before insert or update of order_id on public.provider_provision_jobs
for each row execute function public.reseller_order_must_be_paid();

create or replace function public.provider_provision_direct(
  p_reseller_id uuid,
  p_provider_slug text,
  p_payload jsonb,
  p_order_id uuid
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_payment_status;
  v_job_id bigint;
begin
  if auth.uid() <> p_reseller_id then
    raise exception using
      errcode = 'P0001',
      message = 'Caller does not match the reseller identity',
      detail = 'error_code=PROVISION_RESELLER_MISMATCH';
  end if;

  if p_order_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Provisioning order linkage is required',
      detail = 'error_code=PROVISION_ORDER_LINK_REQUIRED';
  end if;

  select ro.status
  into v_status
  from public.reseller_orders ro
  where ro.id = p_order_id
    and ro.reseller_id = p_reseller_id;

  if v_status is null then
    raise exception using
      errcode = 'P0001',
      message = 'Provisioning order linkage is missing or invalid',
      detail = 'error_code=PROVISION_ORDER_LINK_MISSING';
  end if;

  if v_status <> 'paid' then
    raise exception using
      errcode = 'P0001',
      message = 'Direct provisioning is only allowed for paid orders',
      detail = 'error_code=PROVISION_ORDER_NOT_PAID';
  end if;

  insert into public.provider_provision_jobs (
    reseller_id,
    provider_slug,
    payload,
    order_id
  )
  values (
    p_reseller_id,
    p_provider_slug,
    coalesce(p_payload, '{}'::jsonb),
    p_order_id
  )
  returning id into v_job_id;

  return v_job_id;
end;
$$;

create index if not exists reseller_orders_reseller_id_status_idx
  on public.reseller_orders (reseller_id, status);

commit;
