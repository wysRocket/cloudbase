begin;

create table if not exists public.tax_regions (
  id bigserial primary key,
  country_code text not null,
  region_code text,
  tax_name text not null,
  tax_type text not null check (tax_type in ('vat', 'gst', 'sales_tax', 'other')),
  tax_rate_basis_points integer not null check (tax_rate_basis_points >= 0 and tax_rate_basis_points <= 10000),
  is_reverse_charge_applicable boolean not null default false,
  is_active boolean not null default true,
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tax_regions_unique_country_region_name_from
  on public.tax_regions (country_code, (coalesce(region_code, '')), tax_name, valid_from);

create index if not exists tax_regions_lookup_idx
  on public.tax_regions (country_code, region_code, is_active, valid_from desc);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_order_id uuid references public.payment_orders(id) on delete set null,
  invoice_number text not null unique,
  invoice_status text not null default 'issued' check (invoice_status in ('draft', 'issued', 'void')),
  currency text not null,
  subtotal_minor integer not null check (subtotal_minor >= 0),
  tax_minor integer not null default 0 check (tax_minor >= 0),
  total_minor integer not null check (total_minor >= 0),
  tax_country_code text,
  tax_region_code text,
  tax_registration_number text,
  customer_legal_name text,
  customer_tax_id text,
  customer_billing_address jsonb,
  line_items jsonb not null default '[]'::jsonb,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_minor = subtotal_minor + tax_minor)
);

create index if not exists invoices_user_id_created_at_idx
  on public.invoices (user_id, created_at desc);

create index if not exists invoices_payment_order_id_idx
  on public.invoices (payment_order_id);

alter table public.payment_orders
  add column if not exists tax_country_code text,
  add column if not exists tax_region_code text,
  add column if not exists tax_rate_basis_points integer check (tax_rate_basis_points >= 0 and tax_rate_basis_points <= 10000),
  add column if not exists tax_minor integer default 0 check (tax_minor >= 0),
  add column if not exists subtotal_minor integer check (subtotal_minor >= 0),
  add column if not exists total_minor integer check (total_minor >= 0),
  add column if not exists sandbox_mode boolean not null default false,
  add column if not exists sandbox_reason text,
  add column if not exists order_source text not null default 'customer' check (order_source in ('customer', 'internal_team', 'automation'));

update public.payment_orders
set subtotal_minor = amount_minor
where subtotal_minor is null;

update public.payment_orders
set total_minor = coalesce(subtotal_minor, amount_minor) + coalesce(tax_minor, 0)
where total_minor is null;

alter table public.credit_transactions
  add column if not exists sandbox_mode boolean not null default false,
  add column if not exists test_credit boolean not null default false,
  add column if not exists granted_by uuid references auth.users(id) on delete set null;

create table if not exists public.canary_launch_flags (
  id bigserial primary key,
  service_family text not null,
  region_code text not null,
  is_enabled boolean not null default false,
  rollout_percent integer not null default 0 check (rollout_percent >= 0 and rollout_percent <= 100),
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_family, region_code)
);

create index if not exists canary_launch_flags_enabled_idx
  on public.canary_launch_flags (is_enabled, service_family, region_code);

alter table public.invoices enable row level security;
alter table public.invoices force row level security;
alter table public.canary_launch_flags enable row level security;
alter table public.canary_launch_flags force row level security;
alter table public.tax_regions enable row level security;
alter table public.tax_regions force row level security;

drop policy if exists invoices_select_own_or_admin on public.invoices;
create policy invoices_select_own_or_admin
on public.invoices
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin(auth.uid())
);

drop policy if exists canary_launch_flags_select_all_authenticated on public.canary_launch_flags;
create policy canary_launch_flags_select_all_authenticated
on public.canary_launch_flags
for select
to authenticated
using (true);

drop policy if exists tax_regions_select_all_authenticated on public.tax_regions;
create policy tax_regions_select_all_authenticated
on public.tax_regions
for select
to authenticated
using (true);

grant select on table public.invoices to authenticated;
grant select on table public.canary_launch_flags to authenticated;
grant select on table public.tax_regions to authenticated;

grant select, insert, update on table public.invoices to service_role;
grant select, insert, update on table public.canary_launch_flags to service_role;
grant select, insert, update on table public.tax_regions to service_role;
grant usage, select on sequence public.invoices_id_seq to service_role;
grant usage, select on sequence public.tax_regions_id_seq to service_role;
grant usage, select on sequence public.canary_launch_flags_id_seq to service_role;

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists tax_regions_set_updated_at on public.tax_regions;
create trigger tax_regions_set_updated_at
before update on public.tax_regions
for each row execute function public.set_updated_at();

drop trigger if exists canary_launch_flags_set_updated_at on public.canary_launch_flags;
create trigger canary_launch_flags_set_updated_at
before update on public.canary_launch_flags
for each row execute function public.set_updated_at();

commit;
