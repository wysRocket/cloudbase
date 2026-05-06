-- Recurring billing: charge active resources on their billing cycle.
-- Monthly resources are charged every 30 days.
-- Hourly resources (GPU) are charged every hour.
-- Resources with insufficient balance are suspended and enqueued for provider-level suspension.

-- Step 1: Add billing tracking columns to service_resources
alter table public.service_resources
  add column if not exists last_billed_at timestamptz,
  add column if not exists billing_anchor timestamptz;

create index if not exists service_resources_billing_idx
  on public.service_resources (status, last_billed_at)
  where status = 'active';

-- Step 2: Safe credit deduction helper (returns false instead of raising)
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
  with locked_rows as (
    select amount from public.credit_transactions
    where user_id = p_user_id
    for update
  )
  select coalesce(sum(amount), 0) into v_balance from locked_rows;

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
begin
  for v_row in
    select
      sr.id,
      sr.user_id,
      sr.display_name,
      sr.region,
      sc.sell_price_cents,
      sc.billing_cycle,
      sc.display_name as catalog_name
    from public.service_resources sr
    join lateral (
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
        (sc.billing_cycle = 'monthly'
         and (sr.last_billed_at is null or sr.last_billed_at < now() - interval '30 days'))
        or
        (sc.billing_cycle = 'hourly'
         and (sr.last_billed_at is null or sr.last_billed_at < now() - interval '55 minutes'))
      )
  loop
    v_description := case
      when v_row.billing_cycle = 'hourly'
      then format('Hourly billing: %s (%s UTC)', v_row.display_name, to_char(v_billed_now, 'YYYY-MM-DD HH24:MI'))
      else format('Monthly billing: %s (%s)', v_row.display_name, to_char(v_billed_now, 'Mon YYYY'))
    end;

    if public.deduct_credits_safe(v_row.user_id, v_row.sell_price_cents, v_description) then
      update public.service_resources
      set
        last_billed_at = v_billed_now,
        billing_anchor = coalesce(billing_anchor, v_billed_now),
        updated_at = v_billed_now
      where id = v_row.id;
      v_charged := v_charged + 1;
    else
      -- Suspend the resource: enqueue a provider-level suspension job
      insert into public.provision_jobs (
        resource_id,
        action,
        idempotency_key,
        status,
        request_payload,
        next_run_at
      ) values (
        v_row.id,
        'suspend',
        'billing-suspend-' || v_row.id::text || '-' || to_char(v_billed_now, 'YYYYMMDDHH24'),
        'queued',
        '{"reason":"insufficient_balance"}'::jsonb,
        now()
      )
      on conflict (resource_id, idempotency_key) do nothing;

      update public.service_resources
      set status = 'suspended', updated_at = v_billed_now
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
select cron.schedule(
  'cloudbase-recurring-billing',
  '5 * * * *',
  $$select public.process_recurring_billing();$$
)
where exists (select 1 from pg_extension where extname = 'pg_cron');

notify pgrst, 'reload schema';
