# Secret Rotation Playbook (Reseller Edge Functions)

## Scope
- `SUPABASE_SERVICE_ROLE_KEY`
- Any reseller provider/API credentials.
- Allowlist env values: `RESELLER_ALLOWED_PLANS`, `RESELLER_ALLOWED_REGIONS`, `RESELLER_ALLOWED_SERVICE_TYPES`.

## Rotation steps
1. Create new credentials in upstream providers and record activation window.
2. Update Supabase Edge Function secrets using `supabase secrets set` for production and staging.
3. Deploy reseller functions (`reseller-provision`, `reseller-lifecycle`) with new secrets.
4. Send synthetic requests with `x-request-id` and `x-correlation-id`; verify audit rows are recorded.
5. Revoke old credentials only after successful smoke checks.
6. Export and archive rotation evidence (timestamp, actor, secret names rotated).

## Rollback
- Re-set prior known-good secret values.
- Redeploy the two reseller functions.
- Re-run smoke checks and verify quota/audit operations.
