# Edge Function Security Playbook

## Startup environment validation
All edge functions should validate required environment variables at startup using `requireEnvVars` from `_shared/security.ts`.

## Request schema validation
Use explicit parser helpers in `_shared/security.ts` (`parseCreatePaymentRequest`, `parseContactRequest`) and fail fast with a 4xx response on invalid payloads.

## Catalog allowlists
For reseller/provisioning style requests, enforce server-side allowlists for:
- `plan`
- `region`
- `serviceType`

Current allowlist enforcement is implemented in `create-payment-session`.

## Per-user quota / rate limiting
Use `checkRateLimit(userId, endpoint, maxRequests, windowMs)` for mutable/lifecycle endpoints.
- `create-payment-session`: 10 requests/minute/user.
- `refresh-payment-status`: 60 requests/minute/user.

## Audit metadata on mutable operations
Use `getAuditMetadata(request, actorId)` and persist audit context alongside writes.

## Secret rotation runbook
1. Generate new provider secrets in upstream vendors (Supabase, SafePay, mail provider).
2. Add new secrets to the deployment environment without removing old values.
3. Deploy functions that can read the new values.
4. Validate startup checks pass and smoke test auth/payment/contact endpoints.
5. Revoke old secrets in provider dashboards.
6. Redeploy and verify logs contain no `Missing required environment variables` or auth errors.
7. Record rotation timestamp and owner in incident/security log.
