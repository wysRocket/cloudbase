-- Recurring billing: charge active resources on their billing cycle.
-- Monthly resources are charged every 30 days.
-- Hourly resources (GPU) are charged every hour.
-- Resources with insufficient balance are suspended and enqueued for provider-level suspension.

-- Step 1: Add billing tracking columns to service_resources
alter table public.service_resources
  add column if not exists last_billed_at timestamptz default now(),
  add column if not exists billing_anchor timestamptz default now();

update public.service_resources
set
  last_billed_at = coalesce(last_billed_at, created_at, now()),
  billing_anchor = coalesce(billing_anchor, created_at, last_billed_at, now())
where last_billed_at is null
   or billing_anchor is null;

create index if not exists service_resources_billing_idx
  on public.service_resources (status, billing_anchor)
  where status = 'active';

-- Step 2: Cached balances + safe credit deduction helper (returns false instead of raising)
create table if not exists public.credit_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.credit_balances enable row level security;
alter table public.credit_balances force row level security;

revoke all on table public.credit_balances from anon, authenticated;
grant select on table public.credit_balances to authenticated;
grant select, insert, update, delete on table public.credit_balances to service_role;

drop policy if exists credit_balances_select_own_or_admin on public.credit_balances;
create policy credit_balances_select_own_or_admin
on public.credit_balances
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

insert into public.credit_balances (user_id, balance)
select user_id, coalesce(sum(amount), 0)::integer
from public.credit_transactions
group by user_id
on conflict (user_id) do update
set
  balance = excluded.balance,
  updated_at = now();

create or replace function public.apply_credit_balance_delta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.credit_balances (user_id, balance, updated_at)
  values (new.user_id, new.amount, now())
  on conflict (user_id) do update
  set
    balance = public.credit_balances.balance + excluded.balance,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists credit_transactions_apply_balance_delta on public.credit_transactions;
create trigger credit_transactions_apply_balance_delta
after insert on public.credit_transactions
for each row execute function public.apply_credit_balance_delta();

revoke all on function public.apply_credit_balance_delta() from public;
grant execute on function public.apply_credit_balance_delta() to service_role;

create or replace function public.deduct_credits_safe(
  p_user_id uuid,
  p_amount integer,
  p_description text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  perform pg_advisory_xact_lock(hashtext('cloudbase:credits'), hashtext(p_user_id::text));

  insert into public.credit_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if v_balance < p_amount then
    return false;
  end if;

  insert into public.credit_transactions (user_id, description, amount, type, status)
  values (p_user_id, p_description, -p_amount, 'debit', 'completed');

  return true;
end;
$$;

revoke all on function public.deduct_credits_safe(uuid, integer, text) from public;
grant execute on function public.deduct_credits_safe(uuid, integer, text) to service_role;

-- Replace older provisioning debit helpers so all backend debits share the same serialized balance path.
create or replace function public.deduct_credits_for_provision(
  p_user_id    uuid,
  p_amount     integer,
  p_description text,
  p_resource_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  perform pg_advisory_xact_lock(hashtext('cloudbase:credits'), hashtext(p_user_id::text));

  insert into public.credit_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

  if v_balance < p_amount then
    raise exception 'insufficient_balance'
      using detail = format('balance=%s required=%s', v_balance, p_amount);
  end if;

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
end;
$$;

revoke all on function public.deduct_credits_for_provision(uuid, integer, text, uuid) from public;
grant execute on function public.deduct_credits_for_provision(uuid, integer, text, uuid) to service_role;

create or replace function public.deduct_credits_and_enqueue_provision(
  p_user_id         uuid,
  p_resource_id     uuid,
  p_idempotency_key text,
  p_amount          integer,
  p_description     text,
  out job_id        uuid,
  out is_new        boolean
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

  perform pg_advisory_xact_lock(hashtext('cloudbase:credits'), hashtext(p_user_id::text));

  insert into public.credit_balances (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select balance into v_balance
  from public.credit_balances
  where user_id = p_user_id
  for update;

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

-- Step 3: Main recurring billing processor
create or replace function public.process_recurring_billing()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_charged integer := 0;
  v_suspended integer := 0;
  v_skipped integer := 0;
  v_billed_now timestamptz := now();
  v_description text;
  v_has_lock boolean;
  v_next_anchor timestamptz;
  v_lifecycle_action text;
  v_lifecycle_status public.resource_status;
begin
  select pg_try_advisory_xact_lock(hashtext('cloudbase'), hashtext('recurring_billing')) into v_has_lock;
  if not v_has_lock then
    return jsonb_build_object(
      'charged', 0,
      'suspended', 0,
      'skipped', 0,
      'busy', true,
      'ran_at', v_billed_now
    );
  end if;

  for v_row in
    select
      sr.id,
      sr.user_id,
      sr.service_type,
      sr.display_name,
      sr.region,
      coalesce(sr.billing_anchor, sr.created_at, sr.last_billed_at, v_billed_now) as billing_anchor,
      sc.sell_price_cents,
      sc.billing_cycle,
      sc.display_name as catalog_name
    from public.service_resources sr
    left join lateral (
      select sc2.sell_price_cents, sc2.billing_cycle, sc2.display_name
      from public.service_catalog sc2
      where sc2.is_active = true
        and (
          sc2.plan_code = (sr.metadata->>'planCode') || '-' || sr.region
          or sc2.plan_code = (sr.metadata->>'planCode')
        )
      order by length(sc2.plan_code) desc
      limit 1
    ) sc on true
    where sr.status = 'active'
      and (
        sc.sell_price_cents is null
        or sc.billing_cycle not in ('hourly', 'monthly')
        or
        (sc.billing_cycle = 'monthly'
         and coalesce(sr.billing_anchor, sr.created_at, sr.last_billed_at, v_billed_now) <= v_billed_now - interval '30 days')
        or
        (sc.billing_cycle = 'hourly'
         and coalesce(sr.billing_anchor, sr.created_at, sr.last_billed_at, v_billed_now) <= v_billed_now - interval '55 minutes')
      )
    for update of sr skip locked
  loop
    if v_row.sell_price_cents is null or v_row.billing_cycle not in ('hourly', 'monthly') then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_next_anchor := case
      when v_row.billing_cycle = 'hourly' then v_row.billing_anchor + interval '1 hour'
      else v_row.billing_anchor + interval '30 days'
    end;

    v_description := case
      when v_row.billing_cycle = 'hourly'
      then format('Hourly billing: %s (%s UTC)', v_row.display_name, to_char(v_billed_now at time zone 'UTC', 'YYYY-MM-DD HH24:MI'))
      else format('Monthly billing: %s (%s)', v_row.display_name, to_char(v_billed_now, 'Mon YYYY'))
    end;

    if public.deduct_credits_safe(v_row.user_id, v_row.sell_price_cents, v_description) then
      update public.service_resources
      set
        last_billed_at = v_billed_now,
        billing_anchor = v_next_anchor,
        updated_at = v_billed_now
      where id = v_row.id;
      v_charged := v_charged + 1;
    else
      v_lifecycle_action := case
        when v_row.service_type in ('kubernetes', 'database') then 'delete'
        else 'suspend'
      end;
      v_lifecycle_status := case
        when v_lifecycle_action = 'delete' then 'deleting'::public.resource_status
        else 'suspended'::public.resource_status
      end;

      -- Enqueue a provider-level lifecycle job. K8s and managed databases cannot suspend,
      -- so delete them to stop unpaid provider costs instead of creating unsupported retries.
      insert into public.provision_jobs (
        resource_id,
        action,
        idempotency_key,
        status,
        request_payload,
        next_run_at
      ) values (
        v_row.id,
        v_lifecycle_action,
        'billing-' || v_lifecycle_action || '-' || v_row.id::text || '-' || to_char(v_billed_now, 'YYYYMMDDHH24'),
        'queued',
        '{"reason":"insufficient_balance"}'::jsonb,
        now()
      )
      on conflict (resource_id, idempotency_key) do nothing;

      update public.service_resources
      set status = v_lifecycle_status, updated_at = v_billed_now
      where id = v_row.id;

      v_suspended := v_suspended + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'charged', v_charged,
    'suspended', v_suspended,
    'skipped', v_skipped,
    'ran_at', v_billed_now
  );
end;
$$;

revoke all on function public.process_recurring_billing() from public;
grant execute on function public.process_recurring_billing() to service_role;

-- Step 4: Schedule recurring billing (runs hourly at :05)
-- The function gates on last_billed_at intervals, so:
--   GPU (hourly):  fires on nearly every run (>55 min check)
--   Monthly:       only fires when 30 days have elapsed
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $cron$
      select cron.unschedule('cloudbase-recurring-billing')
      where exists (select 1 from cron.job where jobname = 'cloudbase-recurring-billing')
    $cron$;

    execute $cron$
      select cron.schedule(
        'cloudbase-recurring-billing',
        '5 * * * *',
        $$select public.process_recurring_billing();$$
      )
    $cron$;
  end if;
end $$;

notify pgrst, 'reload schema';
