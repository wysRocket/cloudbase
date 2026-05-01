# Reseller Provisioning Contract

## Overview

`provider-provision` now enforces a strict paid-order linkage before any provisioning job is accepted into the queue.

This contract applies to both queue-based and direct provisioning flows.

## Validation Rules

1. `order_id` is required for all provisioning requests.
2. `order_id` must resolve to a reseller-owned order.
3. The linked order must have `status = paid`.
4. If any check fails, provisioning is rejected and **no** job is queued.

## Direct Provisioning Guard

Use `public.provider_provision_direct(...)` to perform guarded direct provisioning.

The function validates the order linkage and order status before inserting into `public.provider_provision_jobs`.

## Error Codes

Provisioning failures are emitted as SQL exceptions with details including one of:

- `PROVISION_ORDER_LINK_REQUIRED`
  - `order_id` was omitted.
- `PROVISION_ORDER_LINK_MISSING`
  - `order_id` does not exist for the reseller, or linkage is invalid.
- `PROVISION_ORDER_NOT_PAID`
  - the order exists but status is not `paid`.

## Referential Behavior

`public.provider_provision_jobs.order_id` is `NOT NULL` and references `public.reseller_orders(id)` with `ON DELETE RESTRICT`.

This restores strict referential behavior so order/provision integrity is enforced at the database layer.
