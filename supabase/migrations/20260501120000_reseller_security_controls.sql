create table if not exists public.reseller_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  plan text not null,
  region text not null,
  service_type text not null,
  status text not null default 'queued',
  desired_state text,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  correlation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reseller_audit_logs (
  id bigserial primary key,
  actor_id uuid not null references auth.users(id),
  operation text not null,
  resource_id uuid,
  request_id text not null,
  correlation_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reseller_quota_windows (
  user_id uuid not null references auth.users(id),
  action text not null,
  window_start timestamptz not null,
  hit_count integer not null default 0,
  primary key(user_id, action, window_start)
);

create or replace function public.enforce_reseller_quota(p_user_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_now timestamptz := now();
  v_window timestamptz := date_trunc('minute', v_now);
  v_limit integer := 10;
  v_count integer;
begin
  insert into public.reseller_quota_windows(user_id, action, window_start, hit_count)
  values (p_user_id, p_action, v_window, 1)
  on conflict (user_id, action, window_start)
  do update set hit_count = public.reseller_quota_windows.hit_count + 1
  returning hit_count into v_count;

  if v_count > v_limit then
    return jsonb_build_object('allowed', false, 'reason', 'Per-minute quota exceeded');
  end if;

  return jsonb_build_object('allowed', true, 'remaining', v_limit - v_count);
end;
$$;

grant execute on function public.enforce_reseller_quota(uuid, text) to service_role;
grant select, insert, update on table public.reseller_orders to service_role;
grant select, insert on table public.reseller_audit_logs to service_role;
grant select, insert, update on table public.reseller_quota_windows to service_role;
