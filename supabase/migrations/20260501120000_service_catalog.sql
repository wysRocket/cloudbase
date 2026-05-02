create table if not exists public.service_catalog (
  id bigserial primary key,
  sku text not null unique,
  service_type text not null,
  provider text not null,
  provider_sku text not null,
  region text not null,
  base_cost numeric(12,4) not null check (base_cost >= 0),
  sell_price numeric(12,4) not null check (sell_price >= 0),
  billing_cycle text not null,
  quota jsonb not null default '{}'::jsonb,
  margin_percent numeric(6,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_catalog_service_type_idx on public.service_catalog(service_type);
create index if not exists service_catalog_active_idx on public.service_catalog(active);

create or replace function public.touch_service_catalog_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_catalog_set_updated_at on public.service_catalog;
create trigger service_catalog_set_updated_at
before update on public.service_catalog
for each row execute function public.touch_service_catalog_updated_at();

insert into public.service_catalog (sku, service_type, provider, provider_sku, region, base_cost, sell_price, billing_cycle, quota, margin_percent, active) values
('vps-micro','vps','digitalocean','s-1vcpu-1gb','fra1',3.25,5,'monthly','{"ram":"1GB","storage":"25GB","cpu":"1 vCPU","bandwidth":"1TB","image":"ubuntu-22-04-x64"}',53.85,true),
('k8s-production','kubernetes','digitalocean','do:kubernetes:cluster','nyc1',72,100,'monthly','{"version":"1.30","node_size":"s-2vcpu-4gb","node_count":3}',38.89,true),
('db-professional','database','digitalocean','do:database:cluster','fra1',34,50,'monthly','{"engine":"pg","version":"16","size":"db-s-2vcpu-4gb","node_count":1}',47.06,true)
on conflict (sku) do update set
  service_type = excluded.service_type,
  provider = excluded.provider,
  provider_sku = excluded.provider_sku,
  region = excluded.region,
  base_cost = excluded.base_cost,
  sell_price = excluded.sell_price,
  billing_cycle = excluded.billing_cycle,
  quota = excluded.quota,
  margin_percent = excluded.margin_percent,
  active = excluded.active;
