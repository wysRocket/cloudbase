-- Orders/provisioning reconciliation, compensating refunds, price snapshots, reporting and SLA alerts.

create extension if not exists pg_cron with schema extensions;

create table if not exists public.provisioning_reconciliation_runs (
  id bigserial primary key,
  run_at timestamptz not null default now(),
  paid_but_not_provisioned_count integer not null default 0,
  provisioned_without_payment_count integer not null default 0,
  retry_hotspot_count integer not null default 0,
  notes jsonb not null default '{}'::jsonb
);

create table if not exists public.provisioning_alerts (
  id bigserial primary key,
  user_id uuid,
  order_id uuid,
  provision_job_id uuid,
  alert_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  acknowledged_at timestamptz
);

-- price snapshot columns to prevent future catalog drift from rewriting billing history.
alter table if exists public.order_items
  add column if not exists unit_price_minor integer,
  add column if not exists unit_price_currency text,
  add column if not exists unit_price_snapshot jsonb;

alter table if exists public.service_resources
  add column if not exists unit_price_minor integer,
  add column if not exists unit_price_currency text,
  add column if not exists unit_price_snapshot jsonb,
  add column if not exists provision_status text not null default 'pending',
  add column if not exists updated_at timestamptz not null default now();

-- add provisioning SLA metadata and terminal compensation tracking.
alter table if exists public.provision_jobs
  add column if not exists expected_complete_by timestamptz,
  add column if not exists terminal_failed_at timestamptz,
  add column if not exists compensation_status text,
  add column if not exists compensation_credit_transaction_id bigint,
  add column if not exists compensation_refund_reference text,
  add column if not exists retry_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists provision_jobs_expected_complete_by_idx
  on public.provision_jobs (expected_complete_by)
  where expected_complete_by is not null;

create index if not exists provision_jobs_terminal_failed_at_idx
  on public.provision_jobs (terminal_failed_at)
  where terminal_failed_at is not null;

create index if not exists service_resources_order_item_id_idx
  on public.service_resources (order_item_id);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists provisioning_alerts_sent_at_idx
  on public.provisioning_alerts (sent_at)
  where sent_at is null;

create or replace function public.enqueue_terminal_provision_compensation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_user_id uuid;
  v_total_minor integer;
  v_currency text;
  v_credit_tx_id bigint;
begin
  if coalesce(new.status, '') not in ('failed_terminal', 'cancelled_terminal') then
    return new;
  end if;

  if coalesce(old.status, '') in ('failed_terminal', 'cancelled_terminal') then
    return new;
  end if;

  new.terminal_failed_at := coalesce(new.terminal_failed_at, now());

  if coalesce(new.compensation_status, 'pending') <> 'pending' then
    return new;
  end if;

  select oi.order_id,
         o.user_id,
         sum(coalesce(oi.unit_price_minor, 0) * coalesce(oi.quantity, 1))::integer,
         min(coalesce(oi.unit_price_currency, 'USD'))
    into v_order_id, v_user_id, v_total_minor, v_currency
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = new.order_item_id
  group by oi.order_id, o.user_id;

  if v_order_id is null or v_user_id is null or coalesce(v_total_minor, 0) <= 0 then
    new.compensation_status := 'manual_review';
    return new;
  end if;

  insert into public.credit_transactions (
    user_id,
    amount,
    type,
    reason,
    metadata
  ) values (
    v_user_id,
    v_total_minor,
    'credit',
    'terminal provisioning failure compensation',
    jsonb_build_object(
      'source', 'provision_jobs',
      'provision_job_id', new.id,
      'order_id', v_order_id,
      'currency', v_currency,
      'refund_workflow', 'pending'
    )
  ) returning id into v_credit_tx_id;

  new.compensation_credit_transaction_id := v_credit_tx_id;
  new.compensation_status := 'credited';

  insert into public.provisioning_alerts (user_id, order_id, provision_job_id, alert_type, payload)
  values (
    v_user_id,
    v_order_id,
    new.id,
    'terminal_failure_refund_initiated',
    jsonb_build_object('credit_transaction_id', v_credit_tx_id, 'amount_minor', v_total_minor, 'currency', v_currency)
  );

  return new;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'provision_jobs') then
    drop trigger if exists provision_jobs_compensation_trigger on public.provision_jobs;
  end if;
end $$;
create trigger provision_jobs_compensation_trigger
before update of status on public.provision_jobs
for each row
execute function public.enqueue_terminal_provision_compensation();

create or replace function public.provisioning_reconciliation_job()
returns table (
  paid_but_not_provisioned_count integer,
  provisioned_without_payment_count integer,
  retry_hotspot_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with paid_unprovisioned as (
    select distinct o.id
    from public.orders o
    left join public.order_items oi on oi.order_id = o.id
    left join public.service_resources sr on sr.order_item_id = oi.id
    where o.status in ('paid', 'completed')
      and (sr.id is null or sr.provision_status in ('pending', 'failed', 'error'))
  ),
  provisioned_unpaid as (
    select distinct sr.id
    from public.service_resources sr
    join public.order_items oi on oi.id = sr.order_item_id
    join public.orders o on o.id = oi.order_id
    where coalesce(sr.provision_status, '') in ('provisioned', 'active', 'ready')
      and o.status not in ('paid', 'completed')
  ),
  retry_hotspots as (
    select pj.id
    from public.provision_jobs pj
    where coalesce(pj.retry_count, 0) >= 3
      or (pj.status in ('retrying', 'failed') and pj.updated_at < now() - interval '6 hours')
  )
  select
    (select count(*)::integer from paid_unprovisioned),
    (select count(*)::integer from provisioned_unpaid),
    (select count(*)::integer from retry_hotspots);
end;
$$;

create or replace function public.run_and_record_provisioning_reconciliation()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid integer;
  v_unpaid integer;
  v_hotspots integer;
begin
  select paid_but_not_provisioned_count, provisioned_without_payment_count, retry_hotspot_count
    into v_paid, v_unpaid, v_hotspots
  from public.provisioning_reconciliation_job();

  insert into public.provisioning_reconciliation_runs (
    paid_but_not_provisioned_count,
    provisioned_without_payment_count,
    retry_hotspot_count,
    notes
  ) values (
    v_paid,
    v_unpaid,
    v_hotspots,
    jsonb_build_object('job', 'daily_reconciliation')
  );
end;
$$;

select cron.unschedule('daily_provisioning_reconciliation')
where exists (
  select 1 from cron.job where jobname = 'daily_provisioning_reconciliation'
);

select cron.schedule(
  'daily_provisioning_reconciliation',
  '5 2 * * *',
  $$select public.run_and_record_provisioning_reconciliation();$$
);

create or replace view public.admin_paid_but_not_provisioned as
select
  o.id as order_id,
  o.user_id,
  o.status as order_status,
  o.updated_at as order_updated_at,
  count(sr.id) filter (where sr.id is not null) as resource_count,
  count(sr.id) filter (where coalesce(sr.provision_status, '') in ('provisioned', 'active', 'ready')) as provisioned_resources
from public.orders o
left join public.order_items oi on oi.order_id = o.id
left join public.service_resources sr on sr.order_item_id = oi.id
where o.status in ('paid', 'completed')
group by o.id, o.user_id, o.status, o.updated_at
having count(sr.id) = 0
   or count(sr.id) filter (where coalesce(sr.provision_status, '') in ('provisioned', 'active', 'ready')) < count(sr.id);

create or replace view public.admin_provisioned_without_payment as
select
  sr.id as service_resource_id,
  sr.order_item_id,
  oi.order_id,
  o.user_id,
  o.status as order_status,
  sr.provision_status,
  sr.updated_at as resource_updated_at
from public.service_resources sr
join public.order_items oi on oi.id = sr.order_item_id
join public.orders o on o.id = oi.order_id
where coalesce(sr.provision_status, '') in ('provisioned', 'active', 'ready')
  and o.status not in ('paid', 'completed');

create or replace view public.admin_provision_retry_hotspots as
select
  pj.id as provision_job_id,
  pj.order_item_id,
  pj.status,
  pj.retry_count,
  pj.created_at,
  pj.updated_at,
  case
    when coalesce(pj.retry_count, 0) >= 5 then 'critical'
    when coalesce(pj.retry_count, 0) >= 3 then 'high'
    else 'elevated'
  end as hotspot_severity
from public.provision_jobs pj
where coalesce(pj.retry_count, 0) >= 3
   or (pj.status in ('retrying', 'failed') and pj.updated_at < now() - interval '6 hours');

create or replace function public.enqueue_sla_breach_alerts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  with overdue as (
    select
      pj.id as provision_job_id,
      oi.order_id,
      o.user_id,
      pj.expected_complete_by,
      now() as checked_at
    from public.provision_jobs pj
    join public.order_items oi on oi.id = pj.order_item_id
    join public.orders o on o.id = oi.order_id
    where pj.expected_complete_by is not null
      and pj.expected_complete_by < now()
      and pj.status not in ('succeeded', 'completed', 'provisioned', 'failed_terminal', 'cancelled_terminal')
  ), inserted as (
    insert into public.provisioning_alerts (user_id, order_id, provision_job_id, alert_type, payload)
    select
      od.user_id,
      od.order_id,
      od.provision_job_id,
      'sla_breach',
      jsonb_build_object('expected_complete_by', od.expected_complete_by, 'checked_at', od.checked_at)
    from overdue od
    where not exists (
      select 1
      from public.provisioning_alerts pa
      where pa.provision_job_id = od.provision_job_id
        and pa.alert_type = 'sla_breach'
    )
    returning 1
  )
  select count(*) into v_inserted from inserted;

  return coalesce(v_inserted, 0);
end;
$$;

select cron.unschedule('hourly_provisioning_sla_alerts')
where exists (
  select 1 from cron.job where jobname = 'hourly_provisioning_sla_alerts'
);

select cron.schedule(
  'hourly_provisioning_sla_alerts',
  '15 * * * *',
  $$select public.enqueue_sla_breach_alerts();$$
);
