-- Atomic credit deduction for service provisioning.
-- Checks current balance, raises an exception if insufficient, then inserts a debit row.
-- Called from the provider-provision Edge Function before a job is enqueued.
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
  -- Lock the user's transaction rows to prevent concurrent double-spends,
  -- then compute the balance from those locked rows.
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

-- Only the service role (Edge Functions) may execute this; authenticated users
-- call it indirectly through provider-provision which validates ownership.
revoke all on function public.deduct_credits_for_provision(uuid, integer, text, uuid) from public;
grant execute on function public.deduct_credits_for_provision(uuid, integer, text, uuid) to service_role;

-- Combined atomic function: checks balance, deducts credits, AND inserts the
-- provision job all within a single transaction.  This prevents the failure
-- window where credits are deducted but no job is ever created (or vice-versa).
-- Handles idempotency: if a job for (p_resource_id, p_idempotency_key) already
-- exists the function returns its id immediately without re-charging credits.
-- Returns (job_id uuid, is_new boolean) so callers can distinguish a newly
-- created job from a deduplicated one.
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
  -- Idempotency: return the existing job id without re-charging.
  select id into job_id
    from public.provision_jobs
   where idempotency_key = p_idempotency_key
     and resource_id = p_resource_id;

  if job_id is not null then
    is_new := false;
    return;
  end if;

  -- Lock the user's credit_transaction rows to prevent concurrent double-spends,
  -- then compute the balance from those locked rows.
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

  -- Insert the provision job.
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

  -- Deduct credits atomically with the job insert.
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
