<!-- markdownlint-disable-file -->

# Task Research Notes: Clerk to Supabase Auth Migration and Hosting Placement

## Research Executed

### File Analysis

- src/main.jsx
  - App root is wrapped in ClerkProvider and depends on VITE_CLERK_PUBLISHABLE_KEY.
- src/layouts/DashboardLayout.jsx
  - Dashboard route protection currently uses Clerk useUser with isLoaded/isSignedIn checks and redirect to /sign-in.
- src/components/dashboard/DashboardSidebar.jsx
  - Authenticated UI and sign-out controls currently use SignedIn and UserButton from Clerk.
- package.json
  - Dependency stack includes @clerk/clerk-react and has no Supabase client package yet.
- DOCUMENTATION.md
  - Deployment guidance indicates static hosting output (dist/) with no in-repo backend service.
- vercel.json
  - SPA rewrites confirm frontend-only deployment pattern.

### Code Search Results

- clerk|Clerk|@clerk
  - Active Clerk usage in src/main.jsx, src/layouts/DashboardLayout.jsx, src/components/Navbar.jsx, src/components/dashboard/DashboardSidebar.jsx, src/pages/SignInPage.jsx, src/pages/SignUpPage.jsx.
- supabase|@supabase
  - No Supabase usage currently in src/.
- hostinger|vercel|deploy|database|db
  - Repo docs reference static deployment targets and no dedicated app database runtime.

### External Research

- #githubRepo:"supabase/supabase Clerk migration to Supabase Auth React example"
  - Found official patterns for Supabase client initialization in React examples and official Clerk integration references; confirms both direct Supabase Auth and Clerk-with-Supabase token bridge are supported patterns.
- #fetch:https://supabase.com/docs/guides/getting-started/architecture
  - Supabase architecture centers on a hosted Postgres database per project with integrated Auth (GoTrue), API, Realtime, and Storage services.
- #fetch:https://www.hostinger.com/tutorials/what-is-shared-hosting
  - Shared hosting emphasizes limited server control and no root access; VPS/dedicated options are required for full infrastructure control.

### Project Conventions

- Standards referenced: Existing React + Vite SPA architecture, client-side route guards, environment-variable-driven auth provider setup.
- Instructions followed: No project-level instruction folders found at .github/instructions/ or copilot/ in this workspace.

## Key Discoveries

### Project Structure

This project is a frontend-only Vite React SPA deployed as static assets. Authentication is currently fully coupled to Clerk in the app shell and dashboard components. There is no existing backend service in-repo that would host a first-party auth/database layer.

### Implementation Patterns

- Provider-based auth bootstrap in app entry (ClerkProvider wrapper in main root).
- Route-gating in dashboard layout via auth hook state.
- Auth-aware navbar/sidebar rendering using Clerk React primitives.
- Static host deployment assumptions in docs and rewrite config.

### Complete Examples

```jsx
// Current root auth bootstrap pattern (from src/main.jsx)
import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}
```

```jsx
// Official Supabase React client initialization pattern (from Supabase examples/docs)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
```

### API and Schema Documentation

- Supabase managed projects provide a Postgres database plus managed Auth and API services as a platform.
- Hostinger shared hosting is not designed for self-managed multi-service platforms requiring root-level control.

### Configuration Examples

```env
# Current
VITE_CLERK_PUBLISHABLE_KEY=pk_...

# Target (Supabase managed)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
```

### Technical Requirements

- Replace Clerk provider and hooks with Supabase auth session handling.
- Add row-level security design for admin vs non-admin authorization (critical for dashboard).
- Define migration for user identities and role metadata (auth.users + public profile/roles table).
- Keep frontend hosting independent from database hosting unless intentionally self-hosting Supabase stack.

## Recommended Approach

Use Supabase managed platform for both Auth and database, while keeping the website frontend on your existing static host (Hostinger, Vercel, or similar). The database will not live on the same Hostinger server; it will live in your Supabase project region and be accessed securely via Supabase APIs/SDK.

Rationale:

- Matches this repo's static SPA architecture (no backend server requirement).
- Fastest path to admin dashboard with role-based authorization via Postgres + RLS.
- Keeps infra decoupled and scalable (frontend CDN/static host + managed backend platform).

## Implementation Guidance

- **Objectives**: Migrate auth from Clerk to Supabase Auth; implement admin authorization model for dashboard access and actions.
- **Key Tasks**: Install @supabase/supabase-js; replace ClerkProvider/hooks/components; implement auth context/session listener; create admin role schema + RLS policies; migrate sign-in/sign-up pages.
- **Dependencies**: Supabase project, env vars, schema migrations, optional email/OAuth provider configuration.
- **Success Criteria**: Users can sign in with Supabase Auth; dashboard access is policy-controlled by role; static frontend deploy works without embedded secrets; data and auth remain available independent of frontend host.
