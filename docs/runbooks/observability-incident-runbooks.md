# Observability Incident Runbooks

## Retry
1. Confirm provider health recovered.
2. Requeue failed jobs from dead-letter queue.
3. Monitor error rate for 15 minutes.

## Rollback
1. Toggle off impacted `service_feature_flags` rows.
2. Roll back provider routing to last stable profile.
3. Verify no new failures fire.

## Orphan cleanup
1. Run `run_daily_paid_provision_reconciliation()`.
2. Export mismatches from `daily_reconciliation_runs.details`.
3. Trigger repair provisioning for paid-but-unprovisioned records.

## Provider outage mode
1. Set all affected regions to rollout 0%.
2. Accept requests into queue-only mode.
3. Communicate degraded SLA and continue periodic reconciliation.
