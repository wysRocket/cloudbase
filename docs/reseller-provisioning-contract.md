# Reseller Provisioning Contract

This worker accepts `POST` JSON payloads with:

- `service_type`: `kubernetes` | `managed_database` | `gpu`
- `action`: `provision` | `lifecycle` | `sync`
- `provider_resource_id` (required for `lifecycle` and `sync`)
- `payload` (shape depends on service type)

## Normalized statuses

All provider responses are normalized into:

- `pending`
- `provisioning`
- `active`
- `degraded`
- `suspended`
- `error`
- `deleted`

## Kubernetes

### Provision request

```json
{
  "service_type": "kubernetes",
  "action": "provision",
  "payload": {
    "name": "team-a-prod",
    "region": "nyc3",
    "version": "1.31.1-do.0",
    "node_pool_name": "default-pool",
    "node_size": "s-4vcpu-8gb",
    "node_count": 3,
    "tags": ["customer:123", "env:prod"]
  }
}
```

### Sync request

```json
{
  "service_type": "kubernetes",
  "action": "sync",
  "provider_resource_id": "c2a8d4c4-..."
}
```

### Lifecycle request (delete)

```json
{
  "service_type": "kubernetes",
  "action": "lifecycle",
  "provider_resource_id": "c2a8d4c4-..."
}
```

Stored provider identifiers:

- `provider_resource_id`: DigitalOcean cluster ID
- `service_resources.metadata.provider_cluster_id` or `metadata.raw.kubernetes_cluster.id`

## Managed Database

### Provision request

```json
{
  "service_type": "managed_database",
  "action": "provision",
  "payload": {
    "name": "customer-db-prod",
    "engine": "pg",
    "version": "16",
    "region": "nyc3",
    "size": "db-s-2vcpu-4gb",
    "node_count": 2
  }
}
```

### Sync request

```json
{
  "service_type": "managed_database",
  "action": "sync",
  "provider_resource_id": "70f5dcbc-..."
}
```

### Lifecycle request (delete)

```json
{
  "service_type": "managed_database",
  "action": "lifecycle",
  "provider_resource_id": "70f5dcbc-..."
}
```

Stored provider identifiers:

- `provider_resource_id`: DigitalOcean database ID
- `service_resources.metadata.provider_database_id` or `metadata.raw.database.id`

## GPU

### Provision request

```json
{
  "service_type": "gpu",
  "action": "provision",
  "payload": {
    "size": "nvidia-l40s-1x",
    "image": "pytorch-2.4"
  }
}
```

Alias mapping:

- Sizes: `nvidia-l40s-1x -> g-2vcpu-24gb`, `nvidia-h100-1x -> g-8vcpu-160gb`
- Images: `pytorch-2.4 -> gpu-pytorch-2-4-ubuntu-22-04`, `cuda-12 -> gpu-cuda-12-ubuntu-22-04`

### Sync request

```json
{
  "service_type": "gpu",
  "action": "sync",
  "provider_resource_id": "123456789"
}
```

### Lifecycle request

```json
{
  "service_type": "gpu",
  "action": "lifecycle",
  "provider_resource_id": "123456789"
}
```

Stored provider identifiers:

- `provider_resource_id`: provider droplet ID (when created)
- `service_resources.metadata.provider_droplet_id`
