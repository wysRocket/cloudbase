-- Grant INSERT privilege on profiles to authenticated role.
-- The previous grant only included SELECT and UPDATE, so any upsert
-- that results in a new row (INSERT path) was rejected with 400.

grant insert on table public.profiles to authenticated;
