# Provisioning Incident Runbook

## Correlation ID standard

- Generate `x-correlation-id` in the frontend before calling edge functions.
- Forward `x-correlation-id` from the edge function into every provider call and structured log event.
- Persist `correlation_id` in DB write paths (`provision_jobs`, billing mutations, audit events) so support can pivot by one id.

## Frontend to edge propagation

1. Frontend (dashboard/admin action) creates `correlationId` using request id or UUID.
2. Request sends header `x-correlation-id: <id>`.
3. Edge function copies header into logger context and downstream DigitalOcean API headers.
4. DB writes include the same `correlation_id` column value.

## Manual support actions

- **Retry job**: Requeues a failed/stuck job with same payload and new `retry_attempt` increment.
- **Force sync status**: Reads DigitalOcean state and updates local resource + provisioning row.
- **Suspend resource**: Sets internal status to suspended and pauses billing accumulator.
- **Mark resolved**: Closes incident row with operator note and resolution timestamp.

## Rollback policy for failed provision

- If creation fails before external resource exists, mark job `failed`, no billing entries.
- If external resource exists but local persistence fails, run compensating delete in provider and mark `rolled_back`.
- If local persistence succeeds but provider returns partial completion, mark `needs_reconciliation` and trigger force sync.

## Partial billing scenarios

- **Resource created, billing not started**: backfill usage from provider creation timestamp.
- **Billing started, resource deleted externally**: stop billing at last confirmed provider heartbeat.
- **Duplicate charge risk**: lock by `correlation_id` + `resource_id` idempotency key before posting ledger entries.

## Daily reconciliation job (DigitalOcean vs internal)

- Schedule once daily (e.g. 03:00 UTC).
- Pull internal active resources.
- Pull DigitalOcean resources by account/project.
- Compare by provider id and status.
- Create reconciliation findings for:
  - Missing internal record.
  - Missing provider resource.
  - Status mismatch > 10 minutes.
  - Billing active on non-running resource.
- Auto-remediate low-risk mismatches with force sync; escalate the rest to incident queue.

## Escalation thresholds

- Queue depth > 20 for 15 minutes.
- Success rate < 97% over rolling 1 hour.
- P95 API latency > 900ms over rolling 30 minutes.
- Any stuck jobs older than 30 minutes.
