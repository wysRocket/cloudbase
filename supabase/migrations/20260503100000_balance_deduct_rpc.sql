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
as $$
declare
  v_balance integer;
begin
  -- Lock the user's transaction rows to prevent concurrent double-spends.
  select coalesce(sum(amount), 0)
    into v_balance
    from public.credit_transactions
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
    'Completed'
  );
end;
$$;

-- Only the service role (Edge Functions) may execute this; authenticated users
-- call it indirectly through provider-provision which validates ownership.
revoke all on function public.deduct_credits_for_provision(uuid, integer, text, uuid) from public;
grant execute on function public.deduct_credits_for_provision(uuid, integer, text, uuid) to service_role;
