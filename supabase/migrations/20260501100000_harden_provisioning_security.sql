-- Hardening migration for provisioning security controls.

-- 1) Add/verify RLS and ownership policies.
do $$
begin
  if to_regclass('public.orders') is not null then
    execute 'alter table public.orders enable row level security';
    execute 'alter table public.orders force row level security';

    execute 'drop policy if exists orders_select_own on public.orders';
    execute 'create policy orders_select_own on public.orders for select to authenticated using (user_id = auth.uid())';

    execute 'drop policy if exists orders_insert_own on public.orders';
    execute 'create policy orders_insert_own on public.orders for insert to authenticated with check (user_id = auth.uid())';

    execute 'drop policy if exists orders_update_own on public.orders';
    execute 'create policy orders_update_own on public.orders for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';

    execute 'drop policy if exists orders_delete_own on public.orders';
    execute 'create policy orders_delete_own on public.orders for delete to authenticated using (user_id = auth.uid())';
  end if;

  if to_regclass('public.resources') is not null then
    execute 'alter table public.resources add column if not exists deleted_at timestamptz';
    execute 'alter table public.resources add column if not exists delete_requested_at timestamptz';
    execute 'alter table public.resources add column if not exists delete_request_id text';
    execute 'alter table public.resources add column if not exists tombstone_reason text';

    execute 'alter table public.resources enable row level security';
    execute 'alter table public.resources force row level security';

    execute 'drop policy if exists resources_select_own on public.resources';
    execute 'create policy resources_select_own on public.resources for select to authenticated using (user_id = auth.uid())';

    execute 'drop policy if exists resources_insert_own on public.resources';
    execute 'create policy resources_insert_own on public.resources for insert to authenticated with check (user_id = auth.uid())';

    execute 'drop policy if exists resources_update_own on public.resources';
    execute 'create policy resources_update_own on public.resources for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';

    execute 'drop policy if exists resources_delete_own on public.resources';
    execute 'create policy resources_delete_own on public.resources for delete to authenticated using (user_id = auth.uid())';
  end if;

  if to_regclass('public.provision_jobs') is not null then
    execute 'alter table public.provision_jobs enable row level security';
    execute 'alter table public.provision_jobs force row level security';

    execute 'drop policy if exists provision_jobs_select_own on public.provision_jobs';
    execute 'create policy provision_jobs_select_own on public.provision_jobs for select to authenticated using (user_id = auth.uid())';

    execute 'drop policy if exists provision_jobs_insert_own on public.provision_jobs';
    execute 'create policy provision_jobs_insert_own on public.provision_jobs for insert to authenticated with check (user_id = auth.uid())';

    execute 'drop policy if exists provision_jobs_update_own on public.provision_jobs';
    execute 'create policy provision_jobs_update_own on public.provision_jobs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';

    execute 'drop policy if exists provision_jobs_delete_own on public.provision_jobs';
    execute 'create policy provision_jobs_delete_own on public.provision_jobs for delete to authenticated using (user_id = auth.uid())';
  end if;

  if to_regclass('public.provision_events') is not null then
    execute 'alter table public.provision_events enable row level security';
    execute 'alter table public.provision_events force row level security';

    execute 'drop policy if exists provision_events_select_own on public.provision_events';
    execute 'create policy provision_events_select_own on public.provision_events for select to authenticated using (user_id = auth.uid())';

    execute 'drop policy if exists provision_events_insert_own on public.provision_events';
    execute 'create policy provision_events_insert_own on public.provision_events for insert to authenticated with check (user_id = auth.uid())';

    execute 'drop policy if exists provision_events_update_own on public.provision_events';
    execute 'create policy provision_events_update_own on public.provision_events for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';

    execute 'drop policy if exists provision_events_delete_own on public.provision_events';
    execute 'create policy provision_events_delete_own on public.provision_events for delete to authenticated using (user_id = auth.uid())';
  end if;
end
$$;

-- 2) Audit table.
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_id uuid,
  before_metadata jsonb,
  after_metadata jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_logs_resource_created_idx
  on public.audit_logs (resource_id, created_at desc);
create index if not exists audit_logs_request_idx
  on public.audit_logs (request_id);

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

drop policy if exists audit_logs_select_own on public.audit_logs;
create policy audit_logs_select_own
on public.audit_logs
for select
to authenticated
using (actor_id = auth.uid());

revoke all on public.audit_logs from anon;
revoke all on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;

-- 3) Rate limiting and quotas.
create table if not exists public.provisioning_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_calls_per_minute integer not null default 20 check (max_calls_per_minute > 0),
  max_calls_per_day integer not null default 500 check (max_calls_per_day > 0),
  max_active_resources integer not null default 10 check (max_active_resources > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provisioning_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  call_count integer not null default 0,
  primary key (user_id, window_start)
);

create index if not exists provisioning_rate_limits_user_window_idx
  on public.provisioning_rate_limits (user_id, window_start desc);

create or replace function public.check_and_increment_provisioning_quota(
  p_user_id uuid,
  p_request_id text default null
)
returns table (allowed boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_minute_start timestamptz := date_trunc('minute', v_now);
  v_day_start timestamptz := date_trunc('day', v_now);
  v_minute_limit integer;
  v_day_limit integer;
  v_active_limit integer;
  v_minute_count integer;
  v_day_count integer;
  v_active_count integer;
begin
  insert into public.provisioning_quotas (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select max_calls_per_minute, max_calls_per_day, max_active_resources
    into v_minute_limit, v_day_limit, v_active_limit
  from public.provisioning_quotas
  where user_id = p_user_id;

  insert into public.provisioning_rate_limits (user_id, window_start, call_count)
  values (p_user_id, v_minute_start, 1)
  on conflict (user_id, window_start)
  do update set call_count = public.provisioning_rate_limits.call_count + 1
  returning call_count into v_minute_count;

  select coalesce(sum(call_count), 0)
    into v_day_count
  from public.provisioning_rate_limits
  where user_id = p_user_id
    and window_start >= v_day_start;

  if to_regclass('public.resources') is not null then
    execute 'select count(*) from public.resources where user_id = $1 and deleted_at is null'
      into v_active_count
      using p_user_id;
  else
    v_active_count := 0;
  end if;

  if v_minute_count > v_minute_limit then
    return query select false, 'minute_rate_limit_exceeded'::text;
    return;
  end if;

  if v_day_count > v_day_limit then
    return query select false, 'daily_rate_limit_exceeded'::text;
    return;
  end if;

  if v_active_count >= v_active_limit then
    return query select false, 'active_resource_quota_exceeded'::text;
    return;
  end if;

  return query select true, null::text;
end;
$$;

revoke all on function public.check_and_increment_provisioning_quota(uuid, text) from public;
grant execute on function public.check_and_increment_provisioning_quota(uuid, text) to service_role;

-- 4) Soft delete helper for resources prior to destructive operations.
create or replace function public.tombstone_resource(
  p_user_id uuid,
  p_resource_id uuid,
  p_request_id text,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  if to_regclass('public.resources') is null then
    return false;
  end if;

  execute $q$
    update public.resources
    set delete_requested_at = now(),
        delete_request_id = $1,
        tombstone_reason = coalesce($2, tombstone_reason)
    where id = $3 and user_id = $4 and deleted_at is null
  $q$
  using p_request_id, p_reason, p_resource_id, p_user_id;

  get diagnostics v_updated = row_count;

  insert into public.audit_logs (actor_id, action, resource_id, after_metadata, request_id)
  values (p_user_id, 'resource.tombstoned', p_resource_id, jsonb_build_object('reason', p_reason), p_request_id);

  return v_updated > 0;
end;
$$;

revoke all on function public.tombstone_resource(uuid, uuid, text, text) from public;
grant execute on function public.tombstone_resource(uuid, uuid, text, text) to service_role;
