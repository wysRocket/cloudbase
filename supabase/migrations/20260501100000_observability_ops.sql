create table if not exists public.observability_alert_events (
  id bigint generated always as identity primary key,
  alert_type text not null,
  severity text not null default 'warning',
  status text not null default 'ok',
  value numeric not null default 0,
  threshold numeric,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.service_feature_flags (
  id bigint generated always as identity primary key,
  service_type text not null,
  region text not null,
  enabled boolean not null default false,
  rollout_percent int not null default 0 check (rollout_percent between 0 and 100),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (service_type, region)
);

create table if not exists public.daily_reconciliation_runs (
  id bigint generated always as identity primary key,
  run_date date not null unique,
  paid_count int not null default 0,
  provisioned_count int not null default 0,
  mismatch_count int not null default 0,
  status text not null default 'ok',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.run_daily_paid_provision_reconciliation()
returns void
language plpgsql
security definer
as $$
declare
  paid_total int := 0;
  provisioned_total int := 0;
  mismatch_total int := 0;
begin
  select count(*) into paid_total from public.credit_transactions where type = 'credit' and status = 'Completed';
  select count(*) into provisioned_total from public.credit_transactions where type = 'debit' and status = 'Completed';
  mismatch_total := greatest(abs(paid_total - provisioned_total), 0);

  insert into public.daily_reconciliation_runs(run_date, paid_count, provisioned_count, mismatch_count, status, details)
  values (
    current_date,
    paid_total,
    provisioned_total,
    mismatch_total,
    case when mismatch_total > 0 then 'mismatch' else 'ok' end,
    jsonb_build_object('generated_by', 'run_daily_paid_provision_reconciliation')
  )
  on conflict (run_date)
  do update set
    paid_count = excluded.paid_count,
    provisioned_count = excluded.provisioned_count,
    mismatch_count = excluded.mismatch_count,
    status = excluded.status,
    details = excluded.details,
    created_at = now();
end;
$$;
