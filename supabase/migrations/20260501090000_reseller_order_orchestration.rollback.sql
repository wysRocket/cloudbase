begin;

drop trigger if exists service_resources_requires_paid_order on public.service_resources;
drop function if exists public.ensure_paid_order_item_for_service_resource();

alter table public.service_resources
  alter column order_item_id drop not null;

drop table if exists public.provider_provision_queue;
drop table if exists public.service_resources;
drop table if exists public.order_items;
drop table if exists public.orders;

commit;
