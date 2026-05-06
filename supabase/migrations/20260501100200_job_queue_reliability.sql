begin;

create table if not exists public.service_jobs (
  id bigserial primary key,
  service_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed','dead_letter')),
  attempt integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts > 0),
  available_at timestamptz not null default now(),
  last_error_code text,
  last_error_message text,
  provider_request_id text,
  lock_owner uuid,
  lock_acquired_at timestamptz,
  lock_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_jobs_claim_idx
  on public.service_jobs (status, available_at)
  where status in ('queued','processing');
create index if not exists service_jobs_dead_letter_idx
  on public.service_jobs (status, updated_at desc)
  where status = 'dead_letter';

create table if not exists public.service_job_events (
  id bigserial primary key,
  job_id bigint not null references public.service_jobs(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_job_events_job_id_idx
  on public.service_job_events (job_id, created_at desc);

create table if not exists public.service_job_metrics (
  service_type text primary key,
  processed_count bigint not null default 0,
  succeeded_count bigint not null default 0,
  failed_count bigint not null default 0,
  dead_letter_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.classify_terminal_error(error_code text)
returns boolean
language sql
immutable
as $$
  select coalesce(error_code, '') in (
    'invalid_payload',
    'invalid_recipient',
    'unsupported_service',
    'unauthorized',
    'forbidden'
  );
$$;

create or replace function public.record_service_metric(
  p_service_type text,
  p_metric text
)
returns void
language plpgsql
as $$
begin
  insert into public.service_job_metrics (service_type)
  values (p_service_type)
  on conflict (service_type) do nothing;

  update public.service_job_metrics
  set
    processed_count = processed_count + case when p_metric = 'processed' then 1 else 0 end,
    succeeded_count = succeeded_count + case when p_metric = 'succeeded' then 1 else 0 end,
    failed_count = failed_count + case when p_metric = 'failed' then 1 else 0 end,
    dead_letter_count = dead_letter_count + case when p_metric = 'dead_letter' then 1 else 0 end,
    updated_at = now()
  where service_type = p_service_type;
end;
$$;

create or replace function public.claim_service_job(
  p_lock_owner uuid,
  p_lock_timeout_seconds integer default 300
)
returns public.service_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.service_jobs;
begin
  with candidate as (
    select id
    from public.service_jobs
    where (
      status = 'queued'
      or (
        status = 'processing'
        and lock_expires_at is not null
        and lock_expires_at < now()
      )
    )
    and available_at <= now()
    order by available_at asc, id asc
    limit 1
    for update skip locked
  )
  update public.service_jobs j
  set
    status = 'processing',
    lock_owner = p_lock_owner,
    lock_acquired_at = now(),
    lock_expires_at = now() + make_interval(secs => greatest(p_lock_timeout_seconds, 10)),
    updated_at = now()
  from candidate
  where j.id = candidate.id
  returning j.* into v_job;

  if v_job.id is not null then
    insert into public.service_job_events (job_id, event_type, payload)
    values (
      v_job.id,
      'claimed',
      jsonb_build_object(
        'attempt', v_job.attempt,
        'lock_owner', p_lock_owner,
        'lock_expires_at', v_job.lock_expires_at
      )
    );
  end if;

  return v_job;
end;
$$;

create or replace function public.complete_service_job(
  p_job_id bigint,
  p_lock_owner uuid,
  p_provider_request_id text default null,
  p_attempt integer default null
)
returns public.service_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.service_jobs;
begin
  update public.service_jobs
  set
    status = 'succeeded',
    attempt = coalesce(p_attempt, attempt + 1),
    provider_request_id = coalesce(p_provider_request_id, provider_request_id),
    lock_owner = null,
    lock_acquired_at = null,
    lock_expires_at = null,
    updated_at = now()
  where id = p_job_id
    and status = 'processing'
    and lock_owner = p_lock_owner
  returning * into v_job;

  if v_job.id is null then
    return null;
  end if;

  perform public.record_service_metric(v_job.service_type, 'processed');
  perform public.record_service_metric(v_job.service_type, 'succeeded');

  insert into public.service_job_events (job_id, event_type, payload)
  values (
    v_job.id,
    'succeeded',
    jsonb_build_object(
      'provider_request_id', p_provider_request_id,
      'attempt', v_job.attempt
    )
  );

  return v_job;
end;
$$;

create or replace function public.fail_service_job(
  p_job_id bigint,
  p_lock_owner uuid,
  p_error_code text,
  p_error_message text,
  p_provider_request_id text default null,
  p_attempt integer default null
)
returns public.service_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.service_jobs;
  v_next_attempt integer;
  v_terminal boolean;
  v_backoff_seconds integer;
  v_jitter_ms integer;
  v_next_status text;
begin
  select * into v_job
  from public.service_jobs
  where id = p_job_id
    and status = 'processing'
    and lock_owner = p_lock_owner
  for update;

  if v_job.id is null then
    return null;
  end if;

  v_next_attempt := coalesce(p_attempt, v_job.attempt + 1);
  v_terminal := public.classify_terminal_error(p_error_code) or v_next_attempt >= v_job.max_attempts;
  v_backoff_seconds := least(3600, cast(power(2, greatest(v_next_attempt - 1, 0)) as integer));
  v_jitter_ms := floor(random() * 1000)::integer;
  v_next_status := case when v_terminal then 'dead_letter' else 'queued' end;

  update public.service_jobs
  set
    status = v_next_status,
    attempt = v_next_attempt,
    last_error_code = p_error_code,
    last_error_message = p_error_message,
    provider_request_id = coalesce(p_provider_request_id, provider_request_id),
    available_at = case when v_terminal then now() else now() + make_interval(secs => v_backoff_seconds) + (v_jitter_ms::text || ' milliseconds')::interval end,
    lock_owner = null,
    lock_acquired_at = null,
    lock_expires_at = null,
    updated_at = now()
  where id = p_job_id
  returning * into v_job;

  perform public.record_service_metric(v_job.service_type, 'processed');
  perform public.record_service_metric(v_job.service_type, 'failed');
  if v_next_status = 'dead_letter' then
    perform public.record_service_metric(v_job.service_type, 'dead_letter');
  end if;

  insert into public.service_job_events (job_id, event_type, payload)
  values (
    v_job.id,
    case when v_next_status = 'dead_letter' then 'dead_lettered' else 'retry_scheduled' end,
    jsonb_build_object(
      'provider_request_id', p_provider_request_id,
      'error_code', p_error_code,
      'attempt', v_job.attempt,
      'next_status', v_next_status,
      'backoff_seconds', v_backoff_seconds,
      'jitter_ms', v_jitter_ms,
      'terminal', v_terminal
    )
  );

  return v_job;
end;
$$;

create or replace function public.requeue_dead_letter_job(
  p_job_id bigint
)
returns public.service_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.service_jobs;
begin
  update public.service_jobs
  set
    status = 'queued',
    available_at = now(),
    last_error_code = null,
    last_error_message = null,
    lock_owner = null,
    lock_acquired_at = null,
    lock_expires_at = null,
    updated_at = now()
  where id = p_job_id
    and status = 'dead_letter'
  returning * into v_job;

  if v_job.id is not null then
    insert into public.service_job_events (job_id, event_type, payload)
    values (v_job.id, 'requeued', jsonb_build_object('attempt', v_job.attempt));
  end if;

  return v_job;
end;
$$;

commit;
