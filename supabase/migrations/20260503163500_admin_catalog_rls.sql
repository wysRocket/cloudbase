-- Allow admin users to read all service_catalog rows (including inactive)
-- and update sell_price_cents / is_active via the AdminServiceCatalog UI.

-- Grant UPDATE permission to authenticated role (used by admin users directly)
grant update (sell_price_cents, is_active) on table public.service_catalog to authenticated;

-- Admins can see all rows, not just is_active = true
create policy "service_catalog_admin_select_all"
  on public.service_catalog
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update sell price and active flag
create policy "service_catalog_admin_update"
  on public.service_catalog
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
