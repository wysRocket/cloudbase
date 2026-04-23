-- Supabase auth and admin role setup for Cloudbase
-- Run in Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  phone text,
  country_code text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists user_roles_role_idx on public.user_roles (role);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = uid
      and ur.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

alter table public.profiles force row level security;
alter table public.user_roles force row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (
  id = (select auth.uid())
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
)
with check (
  id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists user_roles_select_own_or_admin on public.user_roles;
create policy user_roles_select_own_or_admin
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_admin((select auth.uid())))
);

drop policy if exists user_roles_insert_admin_only on public.user_roles;
create policy user_roles_insert_admin_only
on public.user_roles
for insert
to authenticated
with check ((select public.is_admin((select auth.uid()))));

drop policy if exists user_roles_update_admin_only on public.user_roles;
create policy user_roles_update_admin_only
on public.user_roles
for update
to authenticated
using ((select public.is_admin((select auth.uid()))))
with check ((select public.is_admin((select auth.uid()))));

drop policy if exists user_roles_delete_admin_only on public.user_roles;
create policy user_roles_delete_admin_only
on public.user_roles
for delete
to authenticated
using ((select public.is_admin((select auth.uid()))));

revoke all on table public.user_roles from anon;
revoke all on table public.user_roles from authenticated;
grant select on table public.user_roles to authenticated;

grant select, insert, update on table public.profiles to authenticated;

commit;

-- Seed first admin after one account has signed up:
-- insert into public.user_roles (user_id, role)
-- values ('REPLACE_WITH_AUTH_USER_UUID', 'admin')
-- on conflict do nothing;
