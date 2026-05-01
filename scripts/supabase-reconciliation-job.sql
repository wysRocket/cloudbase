-- Daily paid-vs-provisioned reconciliation
create table if not exists public.provisioning_reconciliation (
  id bigserial primary key,
  day date not null default current_date,
  paid_count integer not null,
  provisioned_count integer not null,
  mismatch_count integer not null,
  status text not null default 'ok',
  created_at timestamptz not null default now()
);

create or replace function public.run_daily_provisioning_reconciliation()
returns void
language plpgsql
security definer
as $$
declare
  paid_total integer := 0;
  provisioned_total integer := 0;
  mismatch_total integer := 0;
begin
  select count(*) into paid_total
  from public.credit_transactions
  where type = 'credit'
    and status = 'Completed'
    and created_at::date = current_date;

  select count(*) into provisioned_total
  from public.credit_transactions
  where type = 'debit'
    and description ilike '%provision%'
    and created_at::date = current_date;

  mismatch_total := abs(paid_total - provisioned_total);

  insert into public.provisioning_reconciliation(day, paid_count, provisioned_count, mismatch_count, status)
  values (
    current_date,
    paid_total,
    provisioned_total,
    mismatch_total,
    case when mismatch_total > 0 then 'mismatch' else 'ok' end
  );
end;
$$;

-- Requires pg_cron extension in Supabase
select cron.schedule(
  'daily-provisioning-reconciliation',
  '15 0 * * *',
  $$select public.run_daily_provisioning_reconciliation();$$
)
where exists (select 1 from pg_extension where extname = 'pg_cron');
