-- Add columns to profiles that may be missing if the table was created
-- before the full schema was defined.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists country_code text,
  add column if not exists city text;
