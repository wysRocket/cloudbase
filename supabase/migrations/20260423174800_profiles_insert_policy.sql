-- Add missing INSERT RLS policy on profiles.
-- upsert() from the client (POST with on_conflict=id) requires both INSERT
-- and UPDATE permissions. The UPDATE policy existed but INSERT was missing,
-- causing 400 Bad Request whenever a user saved their profile for the first time.

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
);
