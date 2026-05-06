begin;

create table if not exists public.provision_jobs (
  id bigserial primary key,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'processing', 'succeeded', 'failed', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  locked_at timestamptz,
  locked_by text,
  next_retry_at timestamptz,
  last_error_code text,
  last_error_message text,
  provider_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provision_events (
  id bigserial primary key,
  job_id bigint not null references public.provision_jobs(id) on delete cascade,
  event_type text not null,
  status text,
  message text,
  provider text,
  provider_request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists provision_jobs_claim_idx
  on public.provision_jobs (status, next_retry_at, created_at)
  where status = 'queued';

create index if not exists provision_jobs_stuck_idx
  on public.provision_jobs (status, locked_at)
  where status = 'processing';

create index if not exists provision_jobs_dead_letter_idx
  on public.provision_jobs (status, created_at)
  where status = 'dead_letter';

create index if not exists provision_events_job_id_created_at_idx
  on public.provision_events (job_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'provision_jobs') then
    drop trigger if exists provision_jobs_set_updated_at on public.provision_jobs;
  end if;
end $$;
create trigger provision_jobs_set_updated_at
before update on public.provision_jobs
for each row execute function public.set_updated_at();

create or replace function public.log_provision_event(
  p_job_id bigint,
  p_event_type text,
  p_status text default null,
  p_message text default null,
  p_provider text default null,
  p_provider_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.provision_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.provision_events;
begin
  insert into public.provision_events (
    job_id,
    event_type,
    status,
    message,
    provider,
    provider_request_id,
    metadata
  )
  values (
    p_job_id,
    p_event_type,
    p_status,
    p_message,
    p_provider,
    p_provider_request_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_event;

  if p_provider_request_id is not null then
    update public.provision_jobs
    set provider_request_id = p_provider_request_id
    where id = p_job_id;
  end if;

  return v_event;
end;
$$;

create or replace function public.claim_provision_job(
  p_worker_id text,
  p_lock_timeout interval default interval '10 minutes'
)
returns public.provision_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.provision_jobs;
begin
  update public.provision_jobs
  set status = 'queued',
      locked_at = null,
      locked_by = null,
      next_retry_at = now()
  where status = 'processing'
    and locked_at is not null
    and locked_at < (now() - p_lock_timeout);

  with candidate as (
    select id
    from public.provision_jobs
    where status = 'queued'
      and (next_retry_at is null or next_retry_at <= now())
    order by created_at asc
    for update skip locked
    limit 1
  )
  update public.provision_jobs j
  set status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id,
      attempt_count = j.attempt_count + 1
  from candidate
  where j.id = candidate.id
    and j.status = 'queued'
  returning j.* into v_job;

  if v_job.id is not null then
    perform public.log_provision_event(
      v_job.id,
      'job_claimed',
      v_job.status,
      'Job claimed by worker',
      null,
      null,
      jsonb_build_object('worker_id', p_worker_id, 'attempt_count', v_job.attempt_count)
    );
  end if;

  return v_job;
end;
$$;

create or replace function public.complete_provision_job(
  p_job_id bigint,
  p_provider text default null,
  p_provider_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.provision_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.provision_jobs;
begin
  update public.provision_jobs
  set status = 'succeeded',
      locked_at = null,
      locked_by = null,
      last_error_code = null,
      last_error_message = null
  where id = p_job_id
    and status = 'processing'
  returning * into v_job;

  if v_job.id is null then
    raise exception 'Job % is not in processing state', p_job_id;
  end if;

  perform public.log_provision_event(
    p_job_id,
    'job_succeeded',
    'succeeded',
    'Provisioning job completed',
    p_provider,
    p_provider_request_id,
    p_metadata
  );

  return v_job;
end;
$$;

create or replace function public.fail_provision_job(
  p_job_id bigint,
  p_error_code text,
  p_error_message text,
  p_is_transient boolean,
  p_retry_delay interval default interval '1 minute',
  p_provider text default null,
  p_provider_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.provision_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.provision_jobs;
  v_next_status text;
  v_message text;
begin
  select * into v_job
  from public.provision_jobs
  where id = p_job_id
  for update;

  if v_job.id is null then
    raise exception 'Job % not found', p_job_id;
  end if;

  if v_job.status <> 'processing' then
    raise exception 'Job % is not in processing state', p_job_id;
  end if;

  if p_is_transient and v_job.attempt_count < v_job.max_attempts then
    v_next_status := 'queued';
    v_message := 'Transient failure: requeued for retry';

    update public.provision_jobs
    set status = 'queued',
        locked_at = null,
        locked_by = null,
        next_retry_at = now() + p_retry_delay,
        last_error_code = p_error_code,
        last_error_message = p_error_message
    where id = p_job_id
    returning * into v_job;
  elsif v_job.attempt_count >= v_job.max_attempts then
    v_next_status := 'dead_letter';
    v_message := 'Max attempts reached: moved to dead letter';

    update public.provision_jobs
    set status = 'dead_letter',
        locked_at = null,
        locked_by = null,
        next_retry_at = null,
        last_error_code = p_error_code,
        last_error_message = p_error_message
    where id = p_job_id
    returning * into v_job;
  else
    v_next_status := 'failed';
    v_message := 'Terminal failure';

    update public.provision_jobs
    set status = 'failed',
        locked_at = null,
        locked_by = null,
        next_retry_at = null,
        last_error_code = p_error_code,
        last_error_message = p_error_message
    where id = p_job_id
    returning * into v_job;
  end if;

  perform public.log_provision_event(
    p_job_id,
    'job_failed',
    v_next_status,
    v_message,
    p_provider,
    p_provider_request_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'error_code', p_error_code,
      'error_message', p_error_message,
      'is_transient', p_is_transient,
      'attempt_count', v_job.attempt_count,
      'max_attempts', v_job.max_attempts
    )
  );

  return v_job;
end;
$$;

create or replace function public.requeue_dead_letter_provision_job(
  p_job_id bigint,
  p_reason text default 'manual_requeue'
)
returns public.provision_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.provision_jobs;
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'Admin access required';
  end if;

  update public.provision_jobs
  set status = 'queued',
      locked_at = null,
      locked_by = null,
      next_retry_at = now(),
      last_error_code = null,
      last_error_message = null
  where id = p_job_id
    and status = 'dead_letter'
  returning * into v_job;

  if v_job.id is null then
    raise exception 'Job % is not dead_letter or not found', p_job_id;
  end if;

  perform public.log_provision_event(
    p_job_id,
    'job_requeued',
    'queued',
    'Dead-letter job requeued by admin',
    null,
    null,
    jsonb_build_object('reason', p_reason, 'admin_user_id', auth.uid())
  );

  return v_job;
end;
$$;

revoke all on table public.provision_jobs from anon;
revoke all on table public.provision_jobs from authenticated;
revoke all on table public.provision_events from anon;
revoke all on table public.provision_events from authenticated;
grant select on table public.provision_jobs to authenticated;
grant select on table public.provision_events to authenticated;

alter table public.provision_jobs enable row level security;
alter table public.provision_jobs force row level security;
alter table public.provision_events enable row level security;
alter table public.provision_events force row level security;

drop policy if exists provision_jobs_admin_read on public.provision_jobs;
create policy provision_jobs_admin_read
on public.provision_jobs
for select
to authenticated
using ((select public.is_admin((select auth.uid()))));

drop policy if exists provision_events_admin_read on public.provision_events;
create policy provision_events_admin_read
on public.provision_events
for select
to authenticated
using ((select public.is_admin((select auth.uid()))));

commit;
