# Operations Runbooks

## 1) Incident Runbook
1. Confirm alert source in **Admin > Observability** (queue depth, failure rate, API latency).
2. Scope blast radius by service type and region.
3. Pause new fulfillment for impacted flag segments.
4. Reconcile paid-but-unprovisioned records.
5. Post status update every 15 minutes until resolved.

## 2) Rollback Runbook
1. Disable feature flags for impacted service/region cohorts.
2. Drain in-flight queue and stop new enqueues for the bad release.
3. Roll back to previous deployment artifact.
4. Re-run reconciliation cron manually and validate no paid order is unprovisioned.

## 3) Provider Outage Runbook
1. Mark provider as degraded in status banner.
2. Route new orders to alternate provider/region when available.
3. Move failed jobs to dead-letter with retry-after metadata.
4. Trigger reconciliation after provider recovery.

## 4) Manual Fulfillment Runbook
1. Validate payment status externally.
2. Provision resource manually in provider console.
3. Backfill resource mapping and mark transaction completed.
4. Add postmortem note with root cause and prevention action.

## 5) Alert thresholds
- Dead-letter spike: >= 8 jobs in 15m.
- Payment/provision mismatch: >= 3 open mismatches in 10m.
- Failure rate warning: > 5% over selected interval.
- API latency warning: p95 > 300ms.
