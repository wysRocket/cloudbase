<!-- markdownlint-disable-file -->

# Migration Plan: Clerk to Supabase Auth (Managed) with Admin Dashboard Readiness

## Goal

Migrate auth from Clerk to Supabase Auth in a Vite + React SPA, then enforce admin access using Postgres roles + RLS.

## Scope

- Replace Clerk provider and auth primitives in frontend.
- Introduce Supabase client and auth state management.
- Replace sign-in/sign-up UI pages.
- Gate dashboard routes with Supabase session.
- Add admin authorization model in Supabase DB.
- Keep static hosting unchanged.

## Current Clerk Touchpoints

- `src/main.jsx`
  - Uses `ClerkProvider` with `VITE_CLERK_PUBLISHABLE_KEY`.
- `src/layouts/DashboardLayout.jsx`
  - Uses `useUser()` for protected dashboard redirect and loading gate.
- `src/components/Navbar.jsx`
  - Uses `SignedIn` and `SignedOut` to switch CTA links.
- `src/components/dashboard/DashboardSidebar.jsx`
  - Uses `SignedIn` and `UserButton` for account section.
- `src/pages/SignInPage.jsx`
  - Uses Clerk `<SignIn />` widget.
- `src/pages/SignUpPage.jsx`
  - Uses Clerk `<SignUp />` widget.
- `package.json`
  - Includes `@clerk/clerk-react` and no Supabase client dependency.

## Target Architecture

- Frontend: existing static host and Vite SPA.
- Auth + DB: Supabase managed project.
- Auth model: Supabase email/password or OTP, with session persisted in browser.
- Authorization model:
  - `public.profiles` for user profile metadata.
  - `public.user_roles` for role mapping (`user`, `admin`).
  - RLS policies that require `admin` role for admin-only data/routes.

## Best-Practice Compliance (Supabase Postgres Skill)

This plan is aligned with the skill and includes explicit controls for critical categories:

- Query Performance (`query-*`)
  - Add indexes for all policy filter columns and frequent WHERE/JOIN columns.
- Connection Management (`conn-*`)
  - Use Supabase managed connection pooler for any future server-side API workers/functions.
- Security & RLS (`security-*`)
  - Enable and force RLS on protected tables.
  - Keep authorization in DB policies, not only frontend route guards.
  - Apply least privilege grants and revoke broad default access.
- Schema Design (`schema-*`)
  - Use explicit PK strategy and index foreign keys.
  - Add uniqueness constraints for role mapping.
- Monitoring (`monitor-*`)
  - Validate key queries/policies with EXPLAIN ANALYZE and monitor with `pg_stat_statements`.

## Migration Phases

### Phase 0 - Preparation

1. Create Supabase project (managed).
2. Configure auth providers and site URLs in Supabase Auth settings:
   - local dev URL
   - production URL
3. Add env vars to frontend:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Keep Clerk live while preparing Supabase in parallel.

Deliverable: Supabase project and credentials available in local env.

### Phase 1 - Client Foundation

1. Install `@supabase/supabase-js`.
2. Add `src/lib/supabaseClient.js` singleton client.
3. Add `src/context/AuthContext.jsx`:
   - `session`, `user`, `loading`
   - `signIn`, `signUp`, `signOut`
   - `onAuthStateChange` subscription
4. Wrap app root with `AuthProvider` (replace Clerk provider in `src/main.jsx`).

Deliverable: app can read Supabase session globally.

### Phase 2 - UI/Auth Flow Replacement

1. Replace `src/pages/SignInPage.jsx` Clerk widget with custom Supabase sign-in form.
2. Replace `src/pages/SignUpPage.jsx` Clerk widget with custom Supabase sign-up form.
3. Add graceful error states (invalid credentials, email confirmation required).
4. Update `src/components/Navbar.jsx`:
   - Replace `SignedIn`/`SignedOut` with `user` from `AuthContext`.
5. Update `src/components/dashboard/DashboardSidebar.jsx`:
   - Replace `UserButton` area with custom account card and sign out action.

Deliverable: end-to-end login/logout works without Clerk components.

### Phase 3 - Route Guards and Session Handling

1. Update `src/layouts/DashboardLayout.jsx`:
   - Replace `useUser()` checks with `AuthContext` session checks.
2. Keep redirect behavior:
   - unauthenticated -> `/sign-in`
3. Add optional public guard:
   - signed-in users hitting `/sign-in` or `/sign-up` -> `/dashboard`.

Deliverable: dashboard route protection works with Supabase session.

### Phase 4 - Admin Authorization Model (DB + RLS)

1. Create schema objects in Supabase SQL:
   - `public.profiles` keyed by `auth.users.id`
   - `public.user_roles` keyed by `user_id` with role enum/text
2. Create helper function `public.is_admin(uid uuid)`.
3. Enable RLS on admin-sensitive tables.
4. Write admin policies that require `is_admin(auth.uid()) = true`.
5. Seed first admin role manually in SQL editor.
6. Add supporting indexes used by RLS and joins (minimum: `user_roles(user_id)`, optional composite index on `(user_id, role)`).
7. Use RLS performance pattern by wrapping auth calls in SELECT where applicable.
8. Force RLS on protected tables where table-owner bypass is not desired.
9. Apply least privilege grants; avoid broad grants to `public`.

Deliverable: admin access is enforced at database layer, not only UI.

### Phase 5 - Cleanup and Hard Cutover

1. Remove Clerk dependency and imports.
2. Remove `VITE_CLERK_PUBLISHABLE_KEY` references.
3. Remove any Clerk pages/config leftovers.
4. Validate production auth redirect URLs in Supabase dashboard.

Deliverable: no Clerk runtime dependency remains.

## Suggested SQL Starter (Admin Role Core)

Use as a starting point and adapt to your actual table names.

1. `profiles`
   - `id uuid primary key references auth.users(id) on delete cascade`
   - `email text`
   - timestamps
2. `user_roles`
   - `user_id uuid references auth.users(id) on delete cascade`
   - `role text check role in ('user','admin')`
   - unique `(user_id, role)`
   - index on `user_id`
3. Function `is_admin(uid uuid)` returns boolean.
4. RLS policy example pattern:
   - allow select/update/delete only when `is_admin((select auth.uid()))`.
5. RLS hardening:
   - `alter table <table_name> enable row level security;`
   - `alter table <table_name> force row level security;`
6. Privilege hardening:
   - revoke broad defaults from `public`.
   - grant only required table/sequence privileges to application roles.

## File-by-File Execution Checklist

1. `package.json`
   - add `@supabase/supabase-js`
   - remove `@clerk/clerk-react` after cutover
2. `src/main.jsx`
   - remove Clerk provider
   - add Auth provider
3. `src/pages/SignInPage.jsx`
   - replace Clerk SignIn widget
4. `src/pages/SignUpPage.jsx`
   - replace Clerk SignUp widget
5. `src/layouts/DashboardLayout.jsx`
   - replace Clerk guard logic
6. `src/components/Navbar.jsx`
   - replace SignedIn/SignedOut rendering
7. `src/components/dashboard/DashboardSidebar.jsx`
   - replace UserButton and auth UI
8. Add new files:
   - `src/lib/supabaseClient.js`
   - `src/context/AuthContext.jsx`

## Risk Controls

- Keep a feature branch for migration.
- Deploy in two stages:
  - Stage A: Supabase auth in preview environment.
  - Stage B: production cutover.
- Keep rollback path for one release window by tagging last Clerk-based release.
- Add temporary telemetry logs around sign-in/sign-up success and failures.

## Test Plan

1. Auth happy paths:
   - sign up, sign in, sign out, session persistence after refresh.
2. Auth edge cases:
   - invalid credentials, unconfirmed email, expired session.
3. Route protection:
   - anonymous user blocked from `/dashboard/*`.
4. Admin authorization:
   - admin can access admin resources.
   - non-admin receives denied response from DB API.
5. Regression:
   - nav CTA changes correctly for signed-in/signed-out.
6. SQL performance and policy validation:
   - EXPLAIN ANALYZE confirms index usage on RLS-filtered queries.
   - verify no unexpected sequential scans on key admin queries.
   - monitor query stats with `pg_stat_statements` after rollout.

## Definition of Done

- All Clerk imports removed.
- Supabase auth fully functional on local and production.
- Dashboard routes guarded via Supabase session.
- Admin access enforced by RLS-backed role model.
- Production deploy completed without auth regressions.

## Recommended Next Execution Order

1. Implement Phase 1 + 2 in code.
2. Implement Phase 3 guard migration.
3. Create DB schema and RLS (Phase 4).
4. Run full test plan.
5. Remove Clerk and ship cutover.
