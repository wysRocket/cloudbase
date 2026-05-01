# Reseller Provisioning Contract (DigitalOcean)

This document defines the backend contract for paid provisioning of:
- VPS Hosting
- Kubernetes
- GPU Servers
- Managed Database
- Game Servers

## 1) Edge Functions

Create the following Supabase Edge Functions:

- `provider-quote`
- `provider-provision`
- `provider-lifecycle`
- `provider-sync-status`
- `provision-job-worker`

### `provider-quote`
**POST** `/provider-quote`

Request:
```json
{
  "planCode": "do-vps-basic-2vcpu-4gb",
  "region": "nyc3",
  "quantity": 1
}
```

Response:
```json
{
  "planCode": "do-vps-basic-2vcpu-4gb",
  "currency": "USD",
  "unitPriceCents": 2400,
  "lineTotalCents": 2400,
  "availability": "available"
}
```

### `provider-provision`
**POST** `/provider-provision`

Request:
```json
{
  "jobId": "<uuid>",
  "resourceId": "<uuid>",
  "serviceType": "vps",
  "planCode": "do-vps-basic-2vcpu-4gb",
  "region": "nyc3",
  "config": {}
}
```

Response:
```json
{
  "status": "accepted",
  "provider": "digitalocean",
  "providerResourceId": "1234567890",
  "normalizedStatus": "provisioning"
}
```

### `provider-lifecycle`
**POST** `/provider-lifecycle`

Request:
```json
{
  "resourceId": "<uuid>",
  "action": "suspend",
  "idempotencyKey": "lifecycle-<uuid>-suspend"
}
```

Response:
```json
{
  "status": "accepted",
  "normalizedStatus": "suspended"
}
```

### `provider-sync-status`
**POST** `/provider-sync-status`

Request:
```json
{
  "resourceId": "<uuid>"
}
```

Response:
```json
{
  "providerStatus": "active",
  "normalizedStatus": "active",
  "updatedAt": "2026-05-01T10:00:00Z"
}
```

## 2) Order + Provisioning Lifecycle

1. UI creates payment session and `orders` / `order_items` in `pending_payment`.
2. Payment webhook or polling marks order `paid`.
3. Backend creates `service_resources` row in `pending`.
4. Backend enqueues `provision_jobs` with action `provision`.
5. `provision-job-worker` picks queued jobs and calls `provider-provision`.
6. Job writes `provision_events` and updates `service_resources.status`.
7. UI polls `service_resources` and displays status progression.

## 3) Normalized Status Mapping

Provider-specific states must be normalized into:
- `pending`
- `provisioning`
- `active`
- `suspended`
- `failed`
- `deleting`
- `deleted`

## 4) Security Requirements

- DO token stored only in Edge Function secrets.
- No provider token in frontend code or response payloads.
- RLS must restrict users to only their own orders/resources/jobs/events.
- Every mutating call requires an idempotency key.
- All lifecycle actions must emit `provision_events` for auditability.

## 5) Service-specific `config` contract

### VPS
```json
{ "hostname": "vm-001", "sshKeyIds": [1234] }
```

### Kubernetes
```json
{ "clusterName": "prod-cluster", "nodePool": { "count": 3 } }
```

### GPU
```json
{ "image": "ubuntu-22-04-x64", "gpuProfile": "nvidia-l40s" }
```

### Database
```json
{ "engine": "postgres", "version": "16", "dbName": "appdb" }
```

### Game Server
```json
{ "game": "minecraft", "version": "latest", "maxPlayers": 20 }
```
