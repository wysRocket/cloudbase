begin;

-- Clean up legacy rows created during direct-provisioning that never had an order item.
delete from public.service_resources
where order_item_id is null
  and created_at < timestamptz '2026-05-01 00:00:00+00';

-- Enforce resource ownership through order items.
alter table if exists public.service_resources
  alter column order_item_id set not null;

-- Ensure order item references stay consistent and cannot be orphaned.
alter table if exists public.service_resources
  drop constraint if exists service_resources_order_item_id_fkey;

alter table if exists public.service_resources
  add constraint service_resources_order_item_id_fkey
  foreign key (order_item_id)
  references public.order_items(id)
  on delete restrict;

-- One resource record per order item.
create unique index if not exists service_resources_order_item_id_unique
  on public.service_resources(order_item_id);

commit;
