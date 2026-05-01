-- Temporarily allow direct provisioning records before full order pipeline is wired.
alter table public.service_resources
  alter column order_item_id drop not null;
