-- public.service_catalog was created in 20260501100000_reseller_control_plane.sql.
-- Upsert catalog entries for VPS, Kubernetes, and Managed Database plans.
insert into public.service_catalog (
  plan_code, service_type, provider, provider_sku, region,
  display_name, base_cost_cents, sell_price_cents, billing_cycle,
  quota, metadata, is_active
) values
(
  'vps-micro',
  'vps'::public.service_type,
  'digitalocean',
  's-1vcpu-1gb',
  'fra1',
  'VPS Micro',
  325,
  500,
  'monthly'::public.billing_cycle,
  '{"ram":"1GB","storage":"25GB","cpu":"1 vCPU","bandwidth":"1TB"}'::jsonb,
  '{"imageSlug":"ubuntu-22-04-x64","sizeSlug":"s-1vcpu-1gb"}'::jsonb,
  true
),
(
  'k8s-production',
  'kubernetes'::public.service_type,
  'digitalocean',
  'do:kubernetes:cluster',
  'nyc1',
  'Kubernetes Production',
  7200,
  10000,
  'monthly'::public.billing_cycle,
  '{"node_count":3}'::jsonb,
  '{"version":"1.30","node_size":"s-2vcpu-4gb","node_count":3}'::jsonb,
  true
),
(
  'db-professional',
  'database'::public.service_type,
  'digitalocean',
  'do:database:cluster',
  'fra1',
  'Managed Database Professional',
  3400,
  5000,
  'monthly'::public.billing_cycle,
  '{"node_count":1}'::jsonb,
  '{"engine":"pg","version":"16","size":"db-s-2vcpu-4gb","node_count":1}'::jsonb,
  true
)
on conflict (plan_code) do update set
  service_type = excluded.service_type,
  provider = excluded.provider,
  provider_sku = excluded.provider_sku,
  region = excluded.region,
  display_name = excluded.display_name,
  base_cost_cents = excluded.base_cost_cents,
  sell_price_cents = excluded.sell_price_cents,
  billing_cycle = excluded.billing_cycle,
  quota = excluded.quota,
  metadata = excluded.metadata,
  is_active = excluded.is_active;
