-- smoke: this file used to mutate reseller order tables during migration replay.
-- Supabase Preview applies files lexically, and this timestamp predates the
-- migrations that create public.orders / public.order_items. Keep this file as
-- a no-op marker so fresh branch databases can replay migrations reliably.
do $$
begin
  raise notice 'Skipping reseller order orchestration smoke during migration replay.';
end $$;
