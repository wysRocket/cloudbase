# Migration: enforce `service_resources.order_item_id` NOT NULL

Date: 2026-05-01
Migration file: `supabase/migrations/20260501120000_enforce_order_item_resources.sql`

## What changes

1. Deletes legacy `service_resources` rows where `order_item_id IS NULL`.
2. Sets `service_resources.order_item_id` to `NOT NULL`.
3. Recreates FK from `service_resources.order_item_id -> order_items.id` with `ON DELETE RESTRICT`.
4. Adds a unique index on `service_resources(order_item_id)` to avoid duplicate resources per order item.

## Rollback strategy

If deployment must be rolled back:

1. **Drop strict constraints/index**:
   - `drop index if exists public.service_resources_order_item_id_unique;`
   - `alter table public.service_resources drop constraint if exists service_resources_order_item_id_fkey;`
2. **Allow nullable order links again**:
   - `alter table public.service_resources alter column order_item_id drop not null;`
3. **Restore previous FK behavior** (if it was `ON DELETE SET NULL`):
   - `alter table public.service_resources add constraint service_resources_order_item_id_fkey foreign key (order_item_id) references public.order_items(id) on delete set null;`
4. **Data recovery**:
   - Restore deleted direct-provision rows from backup/PITR if needed.

## Operational notes

- Run `scripts/cleanup-direct-provision-service-resources.sql` before migration in environments with unknown historical data volume.
- Take a DB snapshot (or ensure PITR checkpoint) before running cleanup + migration.
