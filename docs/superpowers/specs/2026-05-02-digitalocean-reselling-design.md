# DigitalOcean Service Reselling — Design Spec

**Date:** 2026-05-02
**Status:** Approved

## Overview

Extend Cloudbase's existing provisioning pipeline to support real DigitalOcean API calls for all five advertised service types: VPS, GPU, Kubernetes, Managed Database, and Game Servers. VPS provisioning already works end-to-end; this spec covers the remaining four types plus the catalog seeding and minimal frontend changes needed to surface them.

**Model:** Cloudbase holds one master `DIGITALOCEAN_API_TOKEN` secret stored in Supabase Edge Function env vars. Users pay with credits; Cloudbase calls DO on their behalf.

---

## Architecture

### Provider Layer Refactor

`supabase/functions/_shared/providers/` becomes:

```
digitalocean-api.ts       ← public router (unchanged interface)
digitalocean-droplet.ts   ← VPS + GPU + Game Servers
digitalocean-k8s.ts       ← DOKS clusters
digitalocean-db.ts        ← Managed databases
digitalocean.ts           ← unchanged (quoteFromCatalog)
```

`digitalocean-api.ts` exports the same three functions (`provisionResource`, `executeLifecycleAction`, `syncResourceStatus`) but dispatches to the correct module by `serviceType`:

- `vps | gpu | game_server` → `digitalocean-droplet.ts`
- `kubernetes` → `digitalocean-k8s.ts`
- `database` → `digitalocean-db.ts`

No other file changes required — `provision-job-worker` already imports from `digitalocean-api.ts` and is fully wired.

---

## Service Type Implementations

### `digitalocean-droplet.ts` (VPS, GPU, Game Server)

All three use `POST /v2/droplets`. Differences are in `size` and `image` only.

| serviceType | size slug | image slug |
|---|---|---|
| `vps` | `metadata.sizeSlug` (e.g. `s-2vcpu-4gb`) | `metadata.imageSlug` (e.g. `ubuntu-22-04-x64`) |
| `gpu` | `metadata.sizeSlug` (e.g. `gpu-h100x1-80gb`) | `ubuntu-22-04-x64` |
| `game_server` | `s-2vcpu-4gb` default | `ubuntu-22-04-x64` + `user_data` SteamCMD install script |

**Lifecycle actions:**
- `suspend` → `POST /v2/droplets/:id/actions` `{ type: "power_off" }`
- `resume` → `POST /v2/droplets/:id/actions` `{ type: "power_on" }`
- `delete` → `DELETE /v2/droplets/:id`

**Status normalization:**
- `new` → `provisioning`
- `active` → `active`
- `off` → `suspended`
- `archive` → `deleted`

### `digitalocean-k8s.ts`

**Provision:** `POST /v2/kubernetes/clusters`
```json
{
  "name": "<displayName>",
  "region": "<region>",
  "version": "<resolved at implementation time: call GET /v2/kubernetes/options and pick the default_cluster_version>",
  "node_pools": [{ "size": "<metadata.nodeSize || s-2vcpu-4gb>", "name": "default", "count": 1 }]
}
```
Returns `cluster.id` as `providerResourceId`.

**Lifecycle:** Only `delete` is supported (`DELETE /v2/kubernetes/clusters/:id`). Calling `suspend` or `resume` returns a user-facing error: "Kubernetes clusters cannot be suspended — delete and recreate instead."

**Status sync:** `GET /v2/kubernetes/clusters/:id`
- `provisioning` → `provisioning`
- `running` → `active`
- `degraded` → `error`
- `deleted` → `deleted`

### `digitalocean-db.ts`

**Provision:** `POST /v2/databases`
```json
{
  "name": "<displayName>",
  "engine": "<metadata.engine || pg>",
  "version": "<metadata.version || 16>",
  "region": "<region>",
  "size": "db-s-1vcpu-1gb",
  "num_nodes": 1
}
```
Returns `database.id` as `providerResourceId`. Connection details (`host`, `port`, `user`, `password`, `ssl`) are written to `service_resources.metadata.connection` at provision time from the initial response, and refreshed on every `syncResourceStatus` call (the full connection object is available in `GET /v2/databases/:id` once `online`).

**Lifecycle:** Only `delete` (`DELETE /v2/databases/:id`). Managed DBs cannot be suspended.

**Status sync:** `GET /v2/databases/:id`
- `creating` | `migrating` | `forking` → `provisioning`
- `online` → `active`
- anything else → `error`

---

## Service Catalog Migration

One new migration seeds all plan codes using `INSERT ... ON CONFLICT (plan_code, region) DO NOTHING` so it is safe to re-run. Each plan code × region = one row.

| plan_code | service_type | billing_cycle | sell_price_cents | regions |
|---|---|---|---|---|
| `do-vps-basic-2vcpu-4gb` | vps | monthly | 1200 | nyc3, sfo3, fra1, lon1, sgp1 |
| `do-k8s-basic-3node` | kubernetes | monthly | 3600 | nyc3, sfo3, fra1, lon1, sgp1 |
| `do-db-pg-basic` | database | monthly | 1500 | nyc3, sfo3, fra1, lon1, sgp1 |
| `do-gpu-h100-1x` | gpu | hourly | 250 | nyc3, fra1 |
| `do-game-basic-2vcpu-4gb` | game_server | monthly | 1400 | nyc3, sfo3, fra1, lon1, sgp1 |

Prices are illustrative — adjust before go-live.

---

## Frontend Changes

### `NewService.jsx`
- Fix GPU plan code: `do-gpu-l40s-1x` → `do-gpu-h100-1x`
- Add `game_server` entry: `{ id: 'game_server', name: 'Game Server', planCode: 'do-game-basic-2vcpu-4gb', ... }`

### `Database.jsx`
- Read `resource.metadata.connection` and display host, port, username, password (masked, with show/hide toggle), and SSL mode.

### `Kubernetes.jsx`
- Add a "Get Kubeconfig" button that calls a new edge function `get-kubeconfig` with the `resourceId`.
- Display the returned YAML in a copyable code block. Only shown when resource status is `active`.

### New edge function: `get-kubeconfig`
- Auth-gated (user must own the resource).
- Reads `provider_resource_id` from `service_resources`.
- Calls `GET /v2/kubernetes/clusters/:id/kubeconfig` on DO API.
- Returns the raw YAML string.

---

## What's Out of Scope

- Resize operations (all types)
- Snapshots / backups
- Firewall / networking configuration
- Multiple node pools for K8s
- Read replicas for databases
- GPU regions beyond nyc3 and fra1

---

## Definition of Done

- [ ] All five service types provision successfully via the real DO API
- [ ] Status sync works for all types (returns `active` once DO finishes provisioning)
- [ ] Lifecycle `delete` works for all types
- [ ] Service catalog migration runs clean with no duplicate rows
- [ ] `NewService.jsx` shows correct plan codes and quotes for all five types
- [ ] `Database.jsx` shows connection string after provisioning
- [ ] `Kubernetes.jsx` shows kubeconfig download after cluster is active
