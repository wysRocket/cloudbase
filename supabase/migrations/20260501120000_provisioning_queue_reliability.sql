create table if not exists public.provision_jobs (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed','dead_letter')),
  attempts integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts > 0),
  last_error text,
  error_class text,
  provider_request_id text,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists provision_jobs_claim_idx on public.provision_jobs (status, available_at, locked_at);

create table if not exists public.provision_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.provision_jobs(id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  provider_request_id text,
  created_at timestamptz not null default now()
);

create index if not exists provision_events_job_id_created_at_idx on public.provision_events (job_id, created_at desc);

create or replace function public.set_provision_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_provision_jobs_updated_at on public.provision_jobs;
create trigger set_provision_jobs_updated_at
before update on public.provision_jobs
for each row execute function public.set_provision_jobs_updated_at();

create or replace function public.classify_provision_error(error_code text, error_message text)
returns text
language plpgsql
as $$
begin
  if error_code in ('ETIMEDOUT','ECONNRESET','EAI_AGAIN','429','500','502','503','504') then
    return 'transient';
  end if;

  if coalesce(error_message,'') ilike any (array['%timeout%','%temporar%','%rate limit%','%try again%']) then
    return 'transient';
  end if;

  return 'terminal';
end;
$$;

create or replace function public.claim_provision_job(lock_timeout_seconds integer default 300, worker_id text default null)
returns public.provision_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.provision_jobs;
begin
  with candidate as (
    select id
    from public.provision_jobs
    where status = 'queued'
      and available_at <= now()
      and (locked_at is null or locked_at < now() - make_interval(secs => lock_timeout_seconds))
    order by created_at
    for update skip locked
    limit 1
  )
  update public.provision_jobs j
  set status = 'processing',
      locked_at = now(),
      locked_by = coalesce(worker_id, current_setting('request.jwt.claim.sub', true), 'worker'),
      started_at = coalesce(j.started_at, now())
  from candidate
  where j.id = candidate.id
    and j.status = 'queued'
  returning j.* into claimed;

  return claimed;
end;
$$;

create or replace function public.finish_provision_job(
  p_job_id uuid,
  p_success boolean,
  p_error_code text default null,
  p_error_message text default null,
  p_provider_request_id text default null
)
returns public.provision_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_job public.provision_jobs;
  next_error_class text;
  next_status text;
  next_attempts integer;
begin
  if p_success then
    update public.provision_jobs
    set status = 'succeeded',
        locked_at = null,
        locked_by = null,
        finished_at = now(),
        provider_request_id = coalesce(p_provider_request_id, provider_request_id),
        error_class = null,
        last_error = null
    where id = p_job_id and status = 'processing'
    returning * into updated_job;

    if updated_job.id is null then
      raise exception 'Job % is not in processing state', p_job_id;
    end if;

    insert into public.provision_events (job_id, event_type, message, metadata, provider_request_id)
    values (updated_job.id, 'job.succeeded', 'Provisioning job completed', jsonb_build_object('attempts', updated_job.attempts), updated_job.provider_request_id);

    return updated_job;
  end if;

  next_error_class := public.classify_provision_error(p_error_code, p_error_message);

  update public.provision_jobs
  set attempts = attempts + 1,
      error_class = next_error_class,
      last_error = coalesce(p_error_message, p_error_code, 'unknown error'),
      provider_request_id = coalesce(p_provider_request_id, provider_request_id)
  where id = p_job_id and status = 'processing'
  returning attempts, max_attempts into next_attempts, updated_job.max_attempts;

  if next_attempts is null then
    raise exception 'Job % is not in processing state', p_job_id;
  end if;

  next_status := case
    when next_error_class = 'terminal' then 'failed'
    when next_attempts >= updated_job.max_attempts then 'dead_letter'
    else 'queued'
  end;

  update public.provision_jobs
  set status = next_status,
      locked_at = null,
      locked_by = null,
      finished_at = case when next_status in ('failed','dead_letter') then now() else finished_at end,
      available_at = case when next_status = 'queued' then now() + (interval '15 seconds' * greatest(next_attempts, 1)) else available_at end
  where id = p_job_id
  returning * into updated_job;

  insert into public.provision_events (job_id, event_type, message, metadata, provider_request_id)
  values (
    updated_job.id,
    case when next_status = 'dead_letter' then 'job.dead_letter' when next_status='queued' then 'job.retry_scheduled' else 'job.failed' end,
    coalesce(p_error_message, 'Provisioning job failed'),
    jsonb_build_object('error_code', p_error_code, 'error_class', next_error_class, 'attempts', updated_job.attempts, 'max_attempts', updated_job.max_attempts),
    updated_job.provider_request_id
  );

  return updated_job;
end;
$$;

grant execute on function public.claim_provision_job(integer, text) to service_role;
grant execute on function public.finish_provision_job(uuid, boolean, text, text, text) to service_role;

