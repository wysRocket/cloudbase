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

create table if not exists public.provisioning_reconciliation_runs (
  id bigserial primary key,
  run_at timestamptz not null default now(),
  paid_but_not_provisioned_count integer not null default 0,
  provisioned_without_payment_count integer not null default 0,
  retry_hotspot_count integer not null default 0,
  notes jsonb not null default '{}'::jsonb
);

create index if not exists service_feature_flags_service_type_idx
  on public.service_feature_flags (service_type, region);
create index if not exists provisioning_reconciliation_runs_run_at_idx
  on public.provisioning_reconciliation_runs (run_at desc);

alter table public.service_feature_flags enable row level security;
alter table public.service_feature_flags force row level security;
alter table public.provisioning_reconciliation_runs enable row level security;
alter table public.provisioning_reconciliation_runs force row level security;

drop policy if exists service_feature_flags_admin_read on public.service_feature_flags;
create policy service_feature_flags_admin_read
on public.service_feature_flags
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists provisioning_reconciliation_runs_admin_read on public.provisioning_reconciliation_runs;
create policy provisioning_reconciliation_runs_admin_read
on public.provisioning_reconciliation_runs
for select
to authenticated
using (public.is_admin((select auth.uid())));

revoke all on table public.service_feature_flags from anon, authenticated;
revoke all on table public.provisioning_reconciliation_runs from anon, authenticated;
grant select on table public.service_feature_flags to authenticated;
grant select on table public.provisioning_reconciliation_runs to authenticated;
grant select, insert, update, delete on table public.service_feature_flags to service_role;
grant select, insert, update, delete on table public.provisioning_reconciliation_runs to service_role;
grant usage, select on sequence public.service_feature_flags_id_seq to service_role;
grant usage, select on sequence public.provisioning_reconciliation_runs_id_seq to service_role;

insert into public.service_feature_flags (service_type, region, enabled, rollout_percent, notes)
select service_type, region, true, 100, 'Live dashboard schema repair default rollout'
from (values
  ('vps', 'nyc3'), ('vps', 'sfo3'), ('vps', 'fra1'), ('vps', 'lon1'), ('vps', 'sgp1'),
  ('kubernetes', 'nyc3'), ('kubernetes', 'sfo3'), ('kubernetes', 'fra1'), ('kubernetes', 'lon1'), ('kubernetes', 'sgp1'),
  ('database', 'nyc3'), ('database', 'sfo3'), ('database', 'fra1'), ('database', 'lon1'), ('database', 'sgp1'),
  ('gpu', 'nyc3'), ('gpu', 'fra1'),
  ('game_server', 'nyc3'), ('game_server', 'sfo3'), ('game_server', 'fra1'), ('game_server', 'lon1'), ('game_server', 'sgp1')
) as flags(service_type, region)
on conflict (service_type, region) do update set
  enabled = excluded.enabled,
  rollout_percent = excluded.rollout_percent,
  updated_at = now();

with catalog(
  plan_code,
  service_type,
  provider_sku,
  display_name,
  base_cost_cents,
  sell_price_cents,
  billing_cycle,
  vcpu,
  memory_mb,
  storage_gb,
  quota,
  metadata,
  regions
) as (
  values
    ('do-vps-basic-2vcpu-4gb', 'vps', 's-2vcpu-4gb', 'VPS Basic (2 vCPU / 4 GB)', 1200, 1200, 'monthly', 2, 4096, 80, '{"bandwidth":"4TB"}'::jsonb, '{"sizeSlug":"s-2vcpu-4gb","imageSlug":"ubuntu-22-04-x64"}'::jsonb, array['nyc3','sfo3','fra1','lon1','sgp1']),
    ('do-k8s-basic-3node', 'kubernetes', 's-2vcpu-4gb', 'Kubernetes Basic (3 nodes)', 3600, 3600, 'monthly', null::integer, null::integer, null::integer, '{"nodes":3,"nodeSize":"s-2vcpu-4gb"}'::jsonb, '{"nodeSize":"s-2vcpu-4gb","nodeCount":3}'::jsonb, array['nyc3','sfo3','fra1','lon1','sgp1']),
    ('do-db-pg-basic', 'database', 'db-s-1vcpu-1gb', 'Managed PostgreSQL Basic', 1500, 1500, 'monthly', 1, 1024, 25, '{"engine":"PostgreSQL","connections":20}'::jsonb, '{"engine":"pg","version":"16","size":"db-s-1vcpu-1gb"}'::jsonb, array['nyc3','sfo3','fra1','lon1','sgp1']),
    ('do-gpu-h100-1x', 'gpu', 'gpu-h100x1-80gb', 'GPU H100 80 GB (1x)', 250, 250, 'hourly', 16, 245760, 300, '{"gpu":"NVIDIA H100","vram":"80GB HBM3"}'::jsonb, '{"sizeSlug":"gpu-h100x1-80gb"}'::jsonb, array['nyc3','fra1']),
    ('do-game-basic-2vcpu-4gb', 'game_server', 's-2vcpu-4gb', 'Game Server Basic (2 vCPU / 4 GB)', 1400, 1400, 'monthly', 2, 4096, 80, '{"playerSlots":256}'::jsonb, '{"sizeSlug":"s-2vcpu-4gb"}'::jsonb, array['nyc3','sfo3','fra1','lon1','sgp1'])
), expanded as (
  select
    concat(c.plan_code, '-', region) as plan_code,
    c.service_type,
    'digitalocean' as provider,
    c.provider_sku,
    region,
    c.display_name,
    c.base_cost_cents,
    c.sell_price_cents,
    c.billing_cycle,
    c.vcpu,
    c.memory_mb,
    c.storage_gb,
    c.quota,
    c.metadata,
    true as is_active
  from catalog c
  cross join unnest(c.regions) as region
)
insert into public.service_catalog (
  plan_code, service_type, provider, provider_sku, region,
  display_name, base_cost_cents, sell_price_cents, billing_cycle,
  vcpu, memory_mb, storage_gb, quota, metadata, is_active
)
select
  plan_code, service_type, provider, provider_sku, region,
  display_name, base_cost_cents, sell_price_cents, billing_cycle,
  vcpu, memory_mb, storage_gb, quota, metadata, is_active
from expanded
on conflict (plan_code) do update set
  service_type = excluded.service_type,
  provider = excluded.provider,
  provider_sku = excluded.provider_sku,
  region = excluded.region,
  display_name = excluded.display_name,
  base_cost_cents = excluded.base_cost_cents,
  sell_price_cents = excluded.sell_price_cents,
  billing_cycle = excluded.billing_cycle,
  vcpu = excluded.vcpu,
  memory_mb = excluded.memory_mb,
  storage_gb = excluded.storage_gb,
  quota = excluded.quota,
  metadata = excluded.metadata,
  is_active = excluded.is_active;

notify pgrst, 'reload schema';
