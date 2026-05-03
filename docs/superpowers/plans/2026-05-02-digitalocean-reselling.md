# DigitalOcean Real Reselling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing provisioning pipeline to the real DigitalOcean API for all five service types — VPS, GPU, Game Server, Kubernetes, and Managed Database.

**Architecture:** Add three per-type modules (`digitalocean-droplet.ts`, `digitalocean-k8s.ts`, `digitalocean-db.ts`) to `_shared/providers/`. Refactor `digitalocean-api.ts` into a thin router that dispatches by `serviceType`. Update two callers (`provision-job-worker`, `provider-sync-status`) for the updated signatures. Add a `get-kubeconfig` edge function. Minimal frontend: fix plan codes in `NewService.jsx`, show DB connection string and K8s kubeconfig button in `ResourceList.jsx`.

**Tech Stack:** Deno + TypeScript (edge functions), DigitalOcean API v2, Vitest (unit tests), React 19 + TailwindCSS (dashboard)

---

## File Map

| Action | File |
|---|---|
| Create | `supabase/functions/_shared/providers/digitalocean-droplet.ts` |
| Create | `supabase/functions/_shared/providers/digitalocean-droplet.test.ts` |
| Create | `supabase/functions/_shared/providers/digitalocean-k8s.ts` |
| Create | `supabase/functions/_shared/providers/digitalocean-k8s.test.ts` |
| Create | `supabase/functions/_shared/providers/digitalocean-db.ts` |
| Create | `supabase/functions/_shared/providers/digitalocean-db.test.ts` |
| Modify | `supabase/functions/_shared/providers/digitalocean-api.ts` |
| Modify | `supabase/functions/provision-job-worker/index.ts` |
| Modify | `supabase/functions/provider-sync-status/index.ts` |
| Create | `supabase/functions/get-kubeconfig/index.ts` |
| Create | `supabase/migrations/20260502120000_seed_do_service_catalog.sql` |
| Modify | `src/pages/dashboard/NewService.jsx` |
| Modify | `src/context/DashboardContext.jsx` |
| Modify | `src/pages/dashboard/ResourceList.jsx` |

---

## Shared Types (reference for all tasks)

These types are defined in `digitalocean-api.ts` (Task 4) and used by every module. Read this before writing any provider file.

> **Test-time note:** Tasks 1–3 use `import type ... from "./digitalocean-api.ts"`. Vitest uses esbuild which strips `import type` at compile time — so these tests run correctly before Task 4 refactors `digitalocean-api.ts`. No action needed.

```typescript
export type ProvisionArgs = {
  serviceType: string;   // "vps" | "gpu" | "game_server" | "kubernetes" | "database"
  region: string;
  displayName: string;
  metadata: Record<string, unknown>;
};

export type ProvisionResult = {
  providerResourceId: string;
  normalizedStatus: string;
  connectionDetails?: Record<string, unknown>; // DB: { host, port, user, password, database, ssl, uri }
};

export type LifecycleArgs = {
  action: string;        // "suspend" | "resume" | "delete"
  providerResourceId: string;
  serviceType: string;
};

export type SyncArgs = {
  providerResourceId: string;
  serviceType: string;
};

export type SyncResult = {
  status: string;
  connectionDetails?: Record<string, unknown>;
};
```

---

## Task 1: `digitalocean-droplet.ts` — VPS, GPU, Game Server

Moves existing VPS logic from `digitalocean-api.ts` into a new file. Adds GPU (different size slug) and game_server (Ubuntu + SteamCMD user_data) branches. Sync now also returns ipv4.

**Files:**
- Create: `supabase/functions/_shared/providers/digitalocean-droplet.ts`
- Create: `supabase/functions/_shared/providers/digitalocean-droplet.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/providers/digitalocean-droplet.test.ts`:

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.stubGlobal("Deno", {
  env: { get: (key: string) => key === "DIGITALOCEAN_API_TOKEN" ? "test-token" : undefined },
});

import {
  provisionDroplet,
  executeDropletLifecycle,
  syncDropletStatus,
} from "./digitalocean-droplet";

function mockFetch(body: unknown, status = 200) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("provisionDroplet", () => {
  it("provisions a VPS droplet", async () => {
    mockFetch({ droplet: { id: 111, status: "new", networks: { v4: [] } } }, 202);
    const result = await provisionDroplet({
      serviceType: "vps",
      region: "nyc3",
      displayName: "my-vps",
      metadata: { sizeSlug: "s-2vcpu-4gb", imageSlug: "ubuntu-22-04-x64" },
    });
    expect(result.providerResourceId).toBe("111");
    expect(result.normalizedStatus).toBe("provisioning");
  });

  it("provisions a GPU droplet using metadata.sizeSlug", async () => {
    mockFetch({ droplet: { id: 222, status: "new", networks: { v4: [] } } }, 202);
    const result = await provisionDroplet({
      serviceType: "gpu",
      region: "nyc3",
      displayName: "my-gpu",
      metadata: { sizeSlug: "gpu-h100x1-80gb" },
    });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.size).toBe("gpu-h100x1-80gb");
    expect(result.providerResourceId).toBe("222");
  });

  it("provisions a game_server with user_data", async () => {
    mockFetch({ droplet: { id: 333, status: "new", networks: { v4: [] } } }, 202);
    await provisionDroplet({
      serviceType: "game_server",
      region: "fra1",
      displayName: "my-game",
      metadata: {},
    });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.user_data).toContain("steamcmd");
  });
});

describe("executeDropletLifecycle", () => {
  it("suspends a droplet (power_off)", async () => {
    mockFetch({ action: { id: 1, status: "in-progress" } });
    const status = await executeDropletLifecycle({ action: "suspend", providerResourceId: "111", serviceType: "vps" });
    expect(status).toBe("suspended");
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/droplets/111/actions");
  });

  it("resumes a droplet (power_on)", async () => {
    mockFetch({ action: { id: 2, status: "in-progress" } });
    const status = await executeDropletLifecycle({ action: "resume", providerResourceId: "111", serviceType: "vps" });
    expect(status).toBe("active");
  });

  it("deletes a droplet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    const status = await executeDropletLifecycle({ action: "delete", providerResourceId: "111", serviceType: "vps" });
    expect(status).toBe("deleted");
  });
});

describe("syncDropletStatus", () => {
  it("returns active status and ipv4 when active", async () => {
    mockFetch({
      droplet: {
        status: "active",
        networks: { v4: [{ ip_address: "1.2.3.4", type: "public" }] },
      },
    });
    const result = await syncDropletStatus({ providerResourceId: "111", serviceType: "vps" });
    expect(result.status).toBe("active");
    expect(result.connectionDetails).toEqual({ ipv4: "1.2.3.4" });
  });

  it("returns provisioning for new droplet with no ip", async () => {
    mockFetch({ droplet: { status: "new", networks: { v4: [] } } });
    const result = await syncDropletStatus({ providerResourceId: "111", serviceType: "vps" });
    expect(result.status).toBe("provisioning");
    expect(result.connectionDetails).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test -- digitalocean-droplet
```

Expected: `Cannot find module './digitalocean-droplet'`

- [ ] **Step 3: Create `digitalocean-droplet.ts`**

Create `supabase/functions/_shared/providers/digitalocean-droplet.ts`:

```typescript
import type { LifecycleArgs, ProvisionArgs, ProvisionResult, SyncArgs, SyncResult } from "./digitalocean-api.ts";

const BASE_URL = "https://api.digitalocean.com/v2";

function getToken(): string {
  const token = Deno.env.get("DIGITALOCEAN_API_TOKEN");
  if (!token) throw new Error("Missing DIGITALOCEAN_API_TOKEN.");
  return token;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`DO API ${res.status}: ${JSON.stringify(payload)}`);
  return payload as T;
}

function normalizeDOStatus(status: string): string {
  if (status === "active") return "active";
  if (status === "off") return "suspended";
  if (status === "archive") return "deleted";
  return "provisioning"; // "new" and any transitional state
}

const STEAMCMD_USER_DATA = `#!/bin/bash
apt-get update -y
apt-get install -y lib32gcc-s1 wget
mkdir -p /opt/steamcmd && cd /opt/steamcmd
wget -q https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz
tar -xzf steamcmd_linux.tar.gz`;

export async function provisionDroplet(args: ProvisionArgs): Promise<ProvisionResult> {
  let size: string;
  let image: string;
  let userData: string | undefined;

  if (args.serviceType === "gpu") {
    size = String(args.metadata.sizeSlug || "gpu-h100x1-80gb");
    image = "ubuntu-22-04-x64";
  } else if (args.serviceType === "game_server") {
    size = String(args.metadata.sizeSlug || "s-2vcpu-4gb");
    image = "ubuntu-22-04-x64";
    userData = STEAMCMD_USER_DATA;
  } else {
    // vps
    size = String(args.metadata.sizeSlug || "s-1vcpu-2gb");
    image = String(args.metadata.imageSlug || "ubuntu-22-04-x64");
  }

  const body: Record<string, unknown> = {
    name: args.displayName,
    region: args.region,
    size,
    image,
    monitoring: true,
  };
  if (userData) body.user_data = userData;

  const created = await apiRequest<{ droplet: { id: number; status: string; networks: { v4: { ip_address: string; type: string }[] } } }>(
    "/droplets",
    { method: "POST", body: JSON.stringify(body) },
  );

  const publicIp = created.droplet.networks?.v4?.find((n) => n.type === "public")?.ip_address;

  return {
    providerResourceId: String(created.droplet.id),
    normalizedStatus: normalizeDOStatus(created.droplet.status),
    connectionDetails: publicIp ? { ipv4: publicIp } : undefined,
  };
}

export async function executeDropletLifecycle(args: LifecycleArgs): Promise<string> {
  const id = args.providerResourceId;
  if (!/^\d+$/.test(id)) throw new Error("Invalid droplet ID.");

  switch (args.action) {
    case "suspend":
      await apiRequest(`/droplets/${id}/actions`, { method: "POST", body: JSON.stringify({ type: "power_off" }) });
      return "suspended";
    case "resume":
      await apiRequest(`/droplets/${id}/actions`, { method: "POST", body: JSON.stringify({ type: "power_on" }) });
      return "active";
    case "delete":
      await apiRequest(`/droplets/${id}`, { method: "DELETE" });
      return "deleted";
    default:
      throw new Error(`Unsupported lifecycle action '${args.action}' for droplets.`);
  }
}

export async function syncDropletStatus(args: SyncArgs): Promise<SyncResult> {
  const result = await apiRequest<{
    droplet: { status: string; networks: { v4: { ip_address: string; type: string }[] } };
  }>(`/droplets/${args.providerResourceId}`);

  const status = normalizeDOStatus(result.droplet.status);
  const publicIp = result.droplet.networks?.v4?.find((n) => n.type === "public")?.ip_address;

  return {
    status,
    connectionDetails: publicIp ? { ipv4: publicIp } : undefined,
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- digitalocean-droplet
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/providers/digitalocean-droplet.ts supabase/functions/_shared/providers/digitalocean-droplet.test.ts
git commit -m "feat: add digitalocean-droplet provider module (VPS, GPU, game server)"
```

---

## Task 2: `digitalocean-k8s.ts` — DOKS Cluster

**Files:**
- Create: `supabase/functions/_shared/providers/digitalocean-k8s.ts`
- Create: `supabase/functions/_shared/providers/digitalocean-k8s.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/providers/digitalocean-k8s.test.ts`:

```typescript
import { vi, describe, it, expect, afterEach } from "vitest";

vi.stubGlobal("Deno", {
  env: { get: (key: string) => key === "DIGITALOCEAN_API_TOKEN" ? "test-token" : undefined },
});

import { provisionK8s, executeK8sLifecycle, syncK8sStatus } from "./digitalocean-k8s";

function mockFetch(body: unknown, status = 200) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("provisionK8s", () => {
  it("creates a DOKS cluster and returns cluster id", async () => {
    mockFetch({ kubernetes_cluster: { id: "abc-123", status: { state: "provisioning" } } }, 201);
    const result = await provisionK8s({
      serviceType: "kubernetes",
      region: "nyc3",
      displayName: "my-cluster",
      metadata: { nodeSize: "s-2vcpu-4gb" },
    });
    expect(result.providerResourceId).toBe("abc-123");
    expect(result.normalizedStatus).toBe("provisioning");
  });

  it("sends correct node pool size from metadata", async () => {
    mockFetch({ kubernetes_cluster: { id: "def-456", status: { state: "provisioning" } } }, 201);
    await provisionK8s({
      serviceType: "kubernetes",
      region: "fra1",
      displayName: "big-cluster",
      metadata: { nodeSize: "s-4vcpu-8gb" },
    });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.node_pools[0].size).toBe("s-4vcpu-8gb");
  });
});

describe("executeK8sLifecycle", () => {
  it("deletes a cluster", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    const status = await executeK8sLifecycle({ action: "delete", providerResourceId: "abc-123", serviceType: "kubernetes" });
    expect(status).toBe("deleted");
  });

  it("throws a user-facing error for suspend", async () => {
    await expect(
      executeK8sLifecycle({ action: "suspend", providerResourceId: "abc-123", serviceType: "kubernetes" }),
    ).rejects.toThrow("Kubernetes clusters cannot be suspended");
  });
});

describe("syncK8sStatus", () => {
  it("maps running → active", async () => {
    mockFetch({ kubernetes_cluster: { id: "abc-123", status: { state: "running" } } });
    const result = await syncK8sStatus({ providerResourceId: "abc-123", serviceType: "kubernetes" });
    expect(result.status).toBe("active");
  });

  it("maps degraded → error", async () => {
    mockFetch({ kubernetes_cluster: { id: "abc-123", status: { state: "degraded" } } });
    const result = await syncK8sStatus({ providerResourceId: "abc-123", serviceType: "kubernetes" });
    expect(result.status).toBe("error");
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test -- digitalocean-k8s
```

Expected: `Cannot find module './digitalocean-k8s'`

- [ ] **Step 3: Create `digitalocean-k8s.ts`**

Create `supabase/functions/_shared/providers/digitalocean-k8s.ts`:

```typescript
import type { LifecycleArgs, ProvisionArgs, ProvisionResult, SyncArgs, SyncResult } from "./digitalocean-api.ts";

const BASE_URL = "https://api.digitalocean.com/v2";

function getToken(): string {
  const token = Deno.env.get("DIGITALOCEAN_API_TOKEN");
  if (!token) throw new Error("Missing DIGITALOCEAN_API_TOKEN.");
  return token;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`DO API ${res.status}: ${JSON.stringify(payload)}`);
  return payload as T;
}

function normalizeK8sState(state: string): string {
  if (state === "running") return "active";
  if (state === "degraded" || state === "error") return "error";
  if (state === "deleted") return "deleted";
  return "provisioning"; // "provisioning", "upgrading", "deleting"
}

// Hardcoded to a recent stable version. Update quarterly or call
// GET /v2/kubernetes/options to resolve dynamically.
const DEFAULT_K8S_VERSION = "1.32.2-do.0";

export async function provisionK8s(args: ProvisionArgs): Promise<ProvisionResult> {
  const nodeSize = String(args.metadata.nodeSize || "s-2vcpu-4gb");

  const created = await apiRequest<{
    kubernetes_cluster: { id: string; status: { state: string } };
  }>("/kubernetes/clusters", {
    method: "POST",
    body: JSON.stringify({
      name: args.displayName,
      region: args.region,
      version: DEFAULT_K8S_VERSION,
      node_pools: [{ name: "default", size: nodeSize, count: 1 }],
    }),
  });

  return {
    providerResourceId: created.kubernetes_cluster.id,
    normalizedStatus: normalizeK8sState(created.kubernetes_cluster.status.state),
  };
}

export async function executeK8sLifecycle(args: LifecycleArgs): Promise<string> {
  if (args.action === "suspend" || args.action === "resume") {
    throw new Error("Kubernetes clusters cannot be suspended — delete and recreate instead.");
  }
  if (args.action === "delete") {
    await apiRequest(`/kubernetes/clusters/${args.providerResourceId}`, { method: "DELETE" });
    return "deleted";
  }
  throw new Error(`Unsupported lifecycle action '${args.action}' for Kubernetes clusters.`);
}

export async function syncK8sStatus(args: SyncArgs): Promise<SyncResult> {
  const result = await apiRequest<{
    kubernetes_cluster: { status: { state: string } };
  }>(`/kubernetes/clusters/${args.providerResourceId}`);

  return { status: normalizeK8sState(result.kubernetes_cluster.status.state) };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- digitalocean-k8s
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/providers/digitalocean-k8s.ts supabase/functions/_shared/providers/digitalocean-k8s.test.ts
git commit -m "feat: add digitalocean-k8s provider module"
```

---

## Task 3: `digitalocean-db.ts` — Managed Database

**Files:**
- Create: `supabase/functions/_shared/providers/digitalocean-db.ts`
- Create: `supabase/functions/_shared/providers/digitalocean-db.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/_shared/providers/digitalocean-db.test.ts`:

```typescript
import { vi, describe, it, expect, afterEach } from "vitest";

vi.stubGlobal("Deno", {
  env: { get: (key: string) => key === "DIGITALOCEAN_API_TOKEN" ? "test-token" : undefined },
});

import { provisionDatabase, executeDatabaseLifecycle, syncDatabaseStatus } from "./digitalocean-db";

const MOCK_CONNECTION = {
  host: "db.example.com",
  port: 25060,
  user: "doadmin",
  password: "secret",
  database: "defaultdb",
  ssl: true,
  uri: "postgresql://doadmin:secret@db.example.com:25060/defaultdb?sslmode=require",
};

function mockFetch(body: unknown, status = 201) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("provisionDatabase", () => {
  it("creates a managed database and returns connection details", async () => {
    mockFetch({ database: { id: "db-uuid-1", status: "creating", connection: MOCK_CONNECTION } });
    const result = await provisionDatabase({
      serviceType: "database",
      region: "nyc3",
      displayName: "my-db",
      metadata: { engine: "pg", version: "16" },
    });
    expect(result.providerResourceId).toBe("db-uuid-1");
    expect(result.normalizedStatus).toBe("provisioning");
    expect(result.connectionDetails?.host).toBe("db.example.com");
    expect(result.connectionDetails?.password).toBe("secret");
  });

  it("sends correct engine from metadata", async () => {
    mockFetch({ database: { id: "db-uuid-2", status: "creating", connection: MOCK_CONNECTION } });
    await provisionDatabase({
      serviceType: "database",
      region: "fra1",
      displayName: "my-mysql",
      metadata: { engine: "mysql", version: "8" },
    });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.engine).toBe("mysql");
    expect(body.version).toBe("8");
  });
});

describe("executeDatabaseLifecycle", () => {
  it("deletes a database cluster", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    const status = await executeDatabaseLifecycle({ action: "delete", providerResourceId: "db-uuid-1", serviceType: "database" });
    expect(status).toBe("deleted");
  });

  it("throws for suspend action", async () => {
    await expect(
      executeDatabaseLifecycle({ action: "suspend", providerResourceId: "db-uuid-1", serviceType: "database" }),
    ).rejects.toThrow("Managed databases cannot be suspended");
  });
});

describe("syncDatabaseStatus", () => {
  it("maps online → active and refreshes connection details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ database: { status: "online", connection: MOCK_CONNECTION } }), { status: 200 }),
    );
    const result = await syncDatabaseStatus({ providerResourceId: "db-uuid-1", serviceType: "database" });
    expect(result.status).toBe("active");
    expect(result.connectionDetails?.host).toBe("db.example.com");
  });

  it("maps creating → provisioning with no connectionDetails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ database: { status: "creating", connection: null } }), { status: 200 }),
    );
    const result = await syncDatabaseStatus({ providerResourceId: "db-uuid-1", serviceType: "database" });
    expect(result.status).toBe("provisioning");
    expect(result.connectionDetails).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npm test -- digitalocean-db
```

Expected: `Cannot find module './digitalocean-db'`

- [ ] **Step 3: Create `digitalocean-db.ts`**

Create `supabase/functions/_shared/providers/digitalocean-db.ts`:

```typescript
import type { LifecycleArgs, ProvisionArgs, ProvisionResult, SyncArgs, SyncResult } from "./digitalocean-api.ts";

const BASE_URL = "https://api.digitalocean.com/v2";

function getToken(): string {
  const token = Deno.env.get("DIGITALOCEAN_API_TOKEN");
  if (!token) throw new Error("Missing DIGITALOCEAN_API_TOKEN.");
  return token;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`DO API ${res.status}: ${JSON.stringify(payload)}`);
  return payload as T;
}

type DOConnection = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  uri: string;
} | null;

function normalizeDBStatus(status: string): string {
  if (status === "online") return "active";
  if (status === "creating" || status === "migrating" || status === "forking") return "provisioning";
  return "error";
}

function mapConnection(conn: DOConnection): Record<string, unknown> | undefined {
  if (!conn || !conn.host) return undefined;
  return {
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password: conn.password,
    database: conn.database,
    ssl: conn.ssl,
    uri: conn.uri,
  };
}

export async function provisionDatabase(args: ProvisionArgs): Promise<ProvisionResult> {
  const engine = String(args.metadata.engine || "pg");
  const version = String(args.metadata.version || "16");

  const created = await apiRequest<{
    database: { id: string; status: string; connection: DOConnection };
  }>("/databases", {
    method: "POST",
    body: JSON.stringify({
      name: args.displayName,
      engine,
      version,
      region: args.region,
      size: "db-s-1vcpu-1gb",
      num_nodes: 1,
    }),
  });

  return {
    providerResourceId: created.database.id,
    normalizedStatus: normalizeDBStatus(created.database.status),
    connectionDetails: mapConnection(created.database.connection),
  };
}

export async function executeDatabaseLifecycle(args: LifecycleArgs): Promise<string> {
  if (args.action === "suspend" || args.action === "resume") {
    throw new Error("Managed databases cannot be suspended — delete and recreate instead.");
  }
  if (args.action === "delete") {
    await apiRequest(`/databases/${args.providerResourceId}`, { method: "DELETE" });
    return "deleted";
  }
  throw new Error(`Unsupported lifecycle action '${args.action}' for databases.`);
}

export async function syncDatabaseStatus(args: SyncArgs): Promise<SyncResult> {
  const result = await apiRequest<{
    database: { status: string; connection: DOConnection };
  }>(`/databases/${args.providerResourceId}`);

  return {
    status: normalizeDBStatus(result.database.status),
    connectionDetails: mapConnection(result.database.connection),
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- digitalocean-db
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/providers/digitalocean-db.ts supabase/functions/_shared/providers/digitalocean-db.test.ts
git commit -m "feat: add digitalocean-db provider module"
```

---

## Task 4: Refactor `digitalocean-api.ts` into a router

Replaces the current implementation with a thin dispatcher. Exports the shared types so other modules can import them. Removes the old inline VPS code (now in `digitalocean-droplet.ts`).

**Files:**
- Modify: `supabase/functions/_shared/providers/digitalocean-api.ts`

- [ ] **Step 1: Replace `digitalocean-api.ts` entirely**

Overwrite `supabase/functions/_shared/providers/digitalocean-api.ts` with:

```typescript
import { provisionDroplet, executeDropletLifecycle, syncDropletStatus } from "./digitalocean-droplet.ts";
import { provisionK8s, executeK8sLifecycle, syncK8sStatus } from "./digitalocean-k8s.ts";
import { provisionDatabase, executeDatabaseLifecycle, syncDatabaseStatus } from "./digitalocean-db.ts";

export type ProvisionArgs = {
  serviceType: string;
  region: string;
  displayName: string;
  metadata: Record<string, unknown>;
};

export type ProvisionResult = {
  providerResourceId: string;
  normalizedStatus: string;
  connectionDetails?: Record<string, unknown>;
};

export type LifecycleArgs = {
  action: string;
  providerResourceId: string;
  serviceType: string;
};

export type SyncArgs = {
  providerResourceId: string;
  serviceType: string;
};

export type SyncResult = {
  status: string;
  connectionDetails?: Record<string, unknown>;
};

const DROPLET_TYPES = new Set(["vps", "gpu", "game_server"]);

export async function provisionResource(args: ProvisionArgs): Promise<ProvisionResult> {
  if (DROPLET_TYPES.has(args.serviceType)) return provisionDroplet(args);
  if (args.serviceType === "kubernetes") return provisionK8s(args);
  if (args.serviceType === "database") return provisionDatabase(args);
  throw new Error(`Unknown serviceType '${args.serviceType}'.`);
}

export async function executeLifecycleAction(args: LifecycleArgs): Promise<string> {
  if (DROPLET_TYPES.has(args.serviceType)) return executeDropletLifecycle(args);
  if (args.serviceType === "kubernetes") return executeK8sLifecycle(args);
  if (args.serviceType === "database") return executeDatabaseLifecycle(args);
  throw new Error(`Unknown serviceType '${args.serviceType}'.`);
}

export async function syncResourceStatus(args: SyncArgs): Promise<SyncResult> {
  if (DROPLET_TYPES.has(args.serviceType)) return syncDropletStatus(args);
  if (args.serviceType === "kubernetes") return syncK8sStatus(args);
  if (args.serviceType === "database") return syncDatabaseStatus(args);
  throw new Error(`Unknown serviceType '${args.serviceType}'.`);
}
```

- [ ] **Step 2: Run all provider tests to confirm nothing broke**

```bash
npm test -- digitalocean-droplet digitalocean-k8s digitalocean-db
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/providers/digitalocean-api.ts
git commit -m "refactor: convert digitalocean-api.ts to service-type router"
```

---

## Task 5: Update `provision-job-worker` — pass `serviceType`, store `connectionDetails`

The worker now needs to pass `serviceType` to `executeLifecycleAction` (signature changed in Task 4) and write `connection_details` to `service_resources` when the provision result includes it.

**Files:**
- Modify: `supabase/functions/provision-job-worker/index.ts`

- [ ] **Step 1: Update the worker**

In `supabase/functions/provision-job-worker/index.ts`, find the two blocks that call `provisionResource` and `executeLifecycleAction` and update them.

Replace the current `if (job.action === "provision")` block and the `else` block (around lines 40–60) with:

```typescript
      let targetStatus = "active";
      let providerResourceId = resource.provider_resource_id as string | null;

      if (job.action === "provision") {
        const provisioned = await provisionResource({
          serviceType: resource.service_type,
          region: resource.region,
          displayName: resource.display_name,
          metadata: (resource.metadata || {}) as Record<string, unknown>,
        });
        targetStatus = provisioned.normalizedStatus;
        providerResourceId = provisioned.providerResourceId;

        const resourceUpdate: Record<string, unknown> = {
          status: targetStatus,
          provider_resource_id: providerResourceId,
        };
        if (provisioned.connectionDetails) {
          resourceUpdate.connection_details = provisioned.connectionDetails;
        }
        await adminClient.from("service_resources").update(resourceUpdate).eq("id", job.resource_id);
      } else {
        if (!providerResourceId) throw new Error("Missing provider_resource_id for lifecycle action.");
        targetStatus = await executeLifecycleAction({
          action: job.action,
          providerResourceId,
          serviceType: resource.service_type,
        });
        await adminClient
          .from("service_resources")
          .update({ status: targetStatus, provider_resource_id: providerResourceId })
          .eq("id", job.resource_id);
      }
```

Also update the select query at the top of the job processing loop to include `service_type` if it isn't already (confirm the current select string includes it — it already does: `"id, service_type, provider_resource_id, display_name, region, metadata"`).

- [ ] **Step 2: Confirm the function compiles (Deno check)**

```bash
cd supabase && npx supabase functions deploy provision-job-worker --dry-run 2>/dev/null || deno check functions/provision-job-worker/index.ts 2>&1 | head -20
```

If Deno is not available locally, skip — the types will be validated on deploy.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/provision-job-worker/index.ts
git commit -m "fix: pass serviceType to executeLifecycleAction, write connectionDetails on provision"
```

---

## Task 6: Update `provider-sync-status` — pass `serviceType`, handle `connectionDetails`

The sync edge function currently calls `syncResourceStatus(String(resource.provider_resource_id))`. After Task 4, the signature is `syncResourceStatus({ providerResourceId, serviceType })`. It also needs to write `connection_details` when the sync result includes it.

**Files:**
- Modify: `supabase/functions/provider-sync-status/index.ts`

- [ ] **Step 1: Update the sync edge function**

In `supabase/functions/provider-sync-status/index.ts`, update the select and the sync call.

Replace the current select:
```typescript
.select("id, status, updated_at, provider_resource_id")
```
with:
```typescript
.select("id, status, updated_at, provider_resource_id, service_type")
```

Replace the current sync block:
```typescript
    let normalizedStatus = resource.status;
    if (resource.provider_resource_id) {
      normalizedStatus = await syncResourceStatus(String(resource.provider_resource_id));
      await adminClient.from("service_resources").update({ status: normalizedStatus }).eq("id", resourceId);
    }

    return jsonResponse({ normalizedStatus, updatedAt: new Date().toISOString() }, 200, request);
```
with:
```typescript
    let normalizedStatus = resource.status;
    if (resource.provider_resource_id) {
      const syncResult = await syncResourceStatus({
        providerResourceId: String(resource.provider_resource_id),
        serviceType: String(resource.service_type),
      });
      normalizedStatus = syncResult.status;

      const updateData: Record<string, unknown> = { status: normalizedStatus };
      if (syncResult.connectionDetails) {
        updateData.connection_details = syncResult.connectionDetails;
      }
      await adminClient.from("service_resources").update(updateData).eq("id", resourceId);
    }

    return jsonResponse({ normalizedStatus, updatedAt: new Date().toISOString() }, 200, request);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/provider-sync-status/index.ts
git commit -m "fix: pass serviceType to syncResourceStatus, write connectionDetails on sync"
```

---

## Task 7: Service Catalog Migration

Seeds all five plan codes × their supported regions. Safe to re-run.

**Files:**
- Create: `supabase/migrations/20260502120000_seed_do_service_catalog.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260502120000_seed_do_service_catalog.sql`:

```sql
-- Seed DigitalOcean plan codes for all supported service types.
-- Uses ON CONFLICT DO NOTHING so this is idempotent.

INSERT INTO service_catalog (plan_code, service_type, billing_cycle, sell_price_cents, region, is_active)
VALUES
  -- VPS (5 regions)
  ('do-vps-basic-2vcpu-4gb', 'vps',         'monthly', 1200, 'nyc3', true),
  ('do-vps-basic-2vcpu-4gb', 'vps',         'monthly', 1200, 'sfo3', true),
  ('do-vps-basic-2vcpu-4gb', 'vps',         'monthly', 1200, 'fra1', true),
  ('do-vps-basic-2vcpu-4gb', 'vps',         'monthly', 1200, 'lon1', true),
  ('do-vps-basic-2vcpu-4gb', 'vps',         'monthly', 1200, 'sgp1', true),

  -- Kubernetes (5 regions)
  ('do-k8s-basic-3node',     'kubernetes',  'monthly', 3600, 'nyc3', true),
  ('do-k8s-basic-3node',     'kubernetes',  'monthly', 3600, 'sfo3', true),
  ('do-k8s-basic-3node',     'kubernetes',  'monthly', 3600, 'fra1', true),
  ('do-k8s-basic-3node',     'kubernetes',  'monthly', 3600, 'lon1', true),
  ('do-k8s-basic-3node',     'kubernetes',  'monthly', 3600, 'sgp1', true),

  -- Managed Database (5 regions)
  ('do-db-pg-basic',         'database',    'monthly', 1500, 'nyc3', true),
  ('do-db-pg-basic',         'database',    'monthly', 1500, 'sfo3', true),
  ('do-db-pg-basic',         'database',    'monthly', 1500, 'fra1', true),
  ('do-db-pg-basic',         'database',    'monthly', 1500, 'lon1', true),
  ('do-db-pg-basic',         'database',    'monthly', 1500, 'sgp1', true),

  -- GPU (2 GPU-capable regions only)
  ('do-gpu-h100-1x',         'gpu',         'hourly',   250, 'nyc3', true),
  ('do-gpu-h100-1x',         'gpu',         'hourly',   250, 'fra1', true),

  -- Game Servers (5 regions)
  ('do-game-basic-2vcpu-4gb','game_server', 'monthly', 1400, 'nyc3', true),
  ('do-game-basic-2vcpu-4gb','game_server', 'monthly', 1400, 'sfo3', true),
  ('do-game-basic-2vcpu-4gb','game_server', 'monthly', 1400, 'fra1', true),
  ('do-game-basic-2vcpu-4gb','game_server', 'monthly', 1400, 'lon1', true),
  ('do-game-basic-2vcpu-4gb','game_server', 'monthly', 1400, 'sgp1', true)

ON CONFLICT (plan_code, region) DO NOTHING;
```

> **Note:** Adjust `sell_price_cents` to reflect your actual markup before go-live.

- [ ] **Step 2: Verify the `service_catalog` table has a unique constraint on `(plan_code, region)`**

```bash
grep -r "plan_code" supabase/migrations/ | grep -i "unique\|constraint" | head -5
```

If no constraint exists, add it at the top of the migration before the INSERT:
```sql
ALTER TABLE service_catalog ADD CONSTRAINT service_catalog_plan_code_region_key UNIQUE (plan_code, region);
```

- [ ] **Step 3: Apply the migration**

```bash
npx supabase db push
```

Expected: migration runs successfully, 23 rows inserted (or fewer if VPS rows already exist).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260502120000_seed_do_service_catalog.sql
git commit -m "feat: seed service catalog with all DO plan codes"
```

---

## Task 8: `get-kubeconfig` Edge Function

Returns the raw kubeconfig YAML for a user's Kubernetes cluster. Auth-gated — user must own the resource.

**Files:**
- Create: `supabase/functions/get-kubeconfig/index.ts`

- [ ] **Step 1: Create the edge function**

Create `supabase/functions/get-kubeconfig/index.ts`:

```typescript
import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

const DO_BASE = "https://api.digitalocean.com/v2";

function getToken(): string {
  const token = Deno.env.get("DIGITALOCEAN_API_TOKEN");
  if (!token) throw new Error("Missing DIGITALOCEAN_API_TOKEN.");
  return token;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

  try {
    const authHeader = request.headers.get("Authorization");
    const userClient = createUserClient(authHeader);
    const adminClient = createAdminClient();

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "You must be signed in." }, 401, request);

    const body = (await request.json()) as Record<string, unknown>;
    const resourceId = String(body?.resourceId || "").trim();
    if (!resourceId) return jsonResponse({ error: "resourceId is required." }, 422, request);

    const { data: resource, error: resourceError } = await adminClient
      .from("service_resources")
      .select("id, service_type, provider_resource_id, status")
      .eq("id", resourceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (resourceError) return jsonResponse({ error: resourceError.message }, 500, request);
    if (!resource) return jsonResponse({ error: "Resource not found." }, 404, request);
    if (resource.service_type !== "kubernetes") return jsonResponse({ error: "Resource is not a Kubernetes cluster." }, 400, request);
    if (resource.status !== "active") return jsonResponse({ error: "Cluster is not yet active." }, 400, request);
    if (!resource.provider_resource_id) return jsonResponse({ error: "Cluster ID not yet assigned." }, 400, request);

    const res = await fetch(`${DO_BASE}/kubernetes/clusters/${resource.provider_resource_id}/kubeconfig`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DO API ${res.status}: ${err}`);
    }

    const kubeconfig = await res.text();
    return jsonResponse({ kubeconfig }, 200, request);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Failed to fetch kubeconfig." }, 500, request);
  }
});
```

- [ ] **Step 2: Add the function to `src/lib/resellerApi.js`**

Append to `src/lib/resellerApi.js`:

```javascript
export async function getKubeconfig({ resourceId }) {
  const { data, error } = await supabase.functions.invoke('get-kubeconfig', {
    body: { resourceId },
  })
  if (error) throw new Error(error.message || 'Unable to fetch kubeconfig.')
  return data.kubeconfig
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/get-kubeconfig/index.ts src/lib/resellerApi.js
git commit -m "feat: add get-kubeconfig edge function and resellerApi helper"
```

---

## Task 9: Update `NewService.jsx` — fix GPU code, add game_server

**Files:**
- Modify: `src/pages/dashboard/NewService.jsx`

- [ ] **Step 1: Update the `serviceTypes` array**

In `src/pages/dashboard/NewService.jsx`, find the `serviceTypes` array (around line 6) and replace it with:

```javascript
const serviceTypes = [
  { id: 'vps',         name: 'Virtual Private Server', description: 'High-performance NVMe VPS',       fallbackPriceLabel: '€12/mo',  fallbackCost: 12,   typeName: 'VPS (Standard)',      planCode: 'do-vps-basic-2vcpu-4gb' },
  { id: 'kubernetes',  name: 'Kubernetes Cluster',      description: 'Managed K8s control plane',      fallbackPriceLabel: '€36/mo',  fallbackCost: 36,   typeName: 'Kubernetes (Managed)',planCode: 'do-k8s-basic-3node'     },
  { id: 'database',    name: 'Managed Database',        description: 'Postgres, MySQL, Redis',         fallbackPriceLabel: '€15/mo',  fallbackCost: 15,   typeName: 'Database (PG/MySQL)', planCode: 'do-db-pg-basic'         },
  { id: 'gpu',         name: 'GPU Instance',            description: 'NVIDIA H100',                    fallbackPriceLabel: '€2.50/hr', fallbackCost: 3,   typeName: 'GPU (H100)',          planCode: 'do-gpu-h100-1x'         },
  { id: 'game_server', name: 'Game Server',             description: 'SteamCMD-ready Ubuntu droplet',  fallbackPriceLabel: '€14/mo',  fallbackCost: 14,   typeName: 'Game Server',         planCode: 'do-game-basic-2vcpu-4gb'},
]
```

- [ ] **Step 2: Fix the `handleDeploy` serviceType mapping**

In `handleDeploy`, find the `createServiceResource` call. The current code has an inline mapping for `k8s` → `kubernetes` and `db` → `database`. Since the new IDs now match the DB service types directly, simplify it:

Replace:
```javascript
serviceType: selectedTypeInfo.id === 'k8s' ? 'kubernetes' : selectedTypeInfo.id === 'db' ? 'database' : selectedTypeInfo.id,
```
With:
```javascript
serviceType: selectedTypeInfo.id,
```

- [ ] **Step 3: Run the dev server and verify the deploy form shows all 5 types**

```bash
npm run dev
```

Open `http://localhost:5173/dashboard/new`. Confirm 5 service types appear and quotes load (or show fallback pricing if catalog rows aren't seeded yet).

- [ ] **Step 4: Commit**

```bash
git add src/pages/dashboard/NewService.jsx
git commit -m "feat: add game_server service type, fix GPU plan code in NewService"
```

---

## Task 10: Dashboard — DB connection string and K8s kubeconfig

Shows connection details inline in `ResourceList.jsx` for database resources. Adds a kubeconfig button for active Kubernetes clusters. Updates `DashboardContext` to fetch `metadata` and `connection_details`.

**Files:**
- Modify: `src/context/DashboardContext.jsx`
- Modify: `src/pages/dashboard/ResourceList.jsx`

- [ ] **Step 1: Update `DashboardContext.jsx` to select `connection_details`**

In `src/context/DashboardContext.jsx`, find the Supabase select query (currently selects `"id, display_name, service_type, region, status, updated_at, connection_details"`). Confirm `connection_details` is already included. If it is, no change needed here.

Update `mapResourceRow` to expose `serviceType` and `connectionDetails` on the mapped object so `ResourceList` can read them:

Find `mapResourceRow` and replace it with:
```javascript
function mapResourceRow(resource) {
  return {
    id: resource.id,
    name: resource.display_name,
    type: resource.service_type,
    region: resource.region,
    price: "-",
    status: resource.status,
    uptime: resource.updated_at ? new Date(resource.updated_at).toLocaleString() : "-",
    ip: resource.connection_details?.ipv4 || "Pending",
    connectionDetails: resource.connection_details || null,
  }
}
```

- [ ] **Step 2: Add `getKubeconfig` import to `ResourceList.jsx`**

At the top of `src/pages/dashboard/ResourceList.jsx`, update the import from `resellerApi`:

```javascript
import { requestLifecycleAction, syncResourceStatus, getKubeconfig } from "../../lib/resellerApi"
```

- [ ] **Step 3: Add expanded-row state and kubeconfig state to `ResourceList.jsx`**

Inside the `ResourceList` component, after the existing `useState` calls, add:

```javascript
const [expandedRow, setExpandedRow] = useState(null)
const [kubeconfigData, setKubeconfigData] = useState({}) // { [resourceId]: string | null }
const [kubeconfigLoading, setKubeconfigLoading] = useState({})
```

Add a handler:
```javascript
async function fetchKubeconfig(resourceId) {
  setKubeconfigLoading((prev) => ({ ...prev, [resourceId]: true }))
  try {
    const yaml = await getKubeconfig({ resourceId })
    setKubeconfigData((prev) => ({ ...prev, [resourceId]: yaml }))
  } catch (err) {
    setActionError((prev) => ({ ...prev, [resourceId]: err instanceof Error ? err.message : "Failed to fetch kubeconfig." }))
  } finally {
    setKubeconfigLoading((prev) => ({ ...prev, [resourceId]: false }))
  }
}
```

- [ ] **Step 4: Add expandable detail rows in the table**

In the `filteredResources.map((res) => { ... })` block, wrap the return in a `React.Fragment` so you can return two `<tr>` elements per resource. Change the map to:

```jsx
{filteredResources.map((res) => {
  const [dotClass, textClass] = statusClasses(res.status).split(" ")
  return (
    <React.Fragment key={res.id}>
      <tr className="hover:bg-white/5 transition-colors">
        {/* ...existing td cells unchanged... */}
      </tr>
```

Then close the Fragment after the new expandable `<tr>` below.

Add the expandable `<tr>` immediately after the existing row's closing `</tr>`:

```jsx
{/* Expandable detail row for DB and K8s */}
{(res.type === 'database' || res.type === 'kubernetes') && (
  <tr>
    <td colSpan={5} className="px-6 pb-4">
      <button
        onClick={() => setExpandedRow(expandedRow === res.id ? null : res.id)}
        className="text-xs text-cyan-400 hover:text-cyan-300 mb-2 block"
      >
        {expandedRow === res.id ? "▲ Hide details" : "▼ Show details"}
      </button>
      {expandedRow === res.id && res.type === 'database' && res.connectionDetails && (
        <div className="bg-black/30 rounded-lg p-4 font-mono text-xs space-y-1 text-slate-300">
          <div><span className="text-slate-500">host:</span> {res.connectionDetails.host}</div>
          <div><span className="text-slate-500">port:</span> {res.connectionDetails.port}</div>
          <div><span className="text-slate-500">user:</span> {res.connectionDetails.user}</div>
          <div><span className="text-slate-500">password:</span> ••••••••
            <button
              className="ml-2 text-cyan-400 hover:text-cyan-300"
              onClick={() => navigator.clipboard.writeText(String(res.connectionDetails.password))}
            >copy</button>
          </div>
          <div><span className="text-slate-500">database:</span> {res.connectionDetails.database}</div>
          <div><span className="text-slate-500">ssl:</span> {res.connectionDetails.ssl ? "required" : "disabled"}</div>
        </div>
      )}
      {expandedRow === res.id && res.type === 'database' && !res.connectionDetails && (
        <p className="text-xs text-slate-500">Connection details not yet available — sync once the database is active.</p>
      )}
      {expandedRow === res.id && res.type === 'kubernetes' && res.status === 'active' && (
        <div>
          <button
            onClick={() => fetchKubeconfig(res.id)}
            disabled={kubeconfigLoading[res.id]}
            className="text-xs px-3 py-1 rounded bg-white/5 text-cyan-300 disabled:opacity-50 mb-2"
          >
            {kubeconfigLoading[res.id] ? "Fetching…" : "Get Kubeconfig"}
          </button>
          {kubeconfigData[res.id] && (
            <div className="relative">
              <pre className="bg-black/30 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto max-h-48">
                {kubeconfigData[res.id]}
              </pre>
              <button
                className="absolute top-2 right-2 text-xs text-cyan-400 hover:text-cyan-300"
                onClick={() => navigator.clipboard.writeText(kubeconfigData[res.id])}
              >copy</button>
            </div>
          )}
        </div>
      )}
      {expandedRow === res.id && res.type === 'kubernetes' && res.status !== 'active' && (
        <p className="text-xs text-slate-500">Kubeconfig is available once the cluster is active.</p>
      )}
    </td>
  </tr>
  </React.Fragment>
)}
```

Also add `import React from 'react'` at the top of `ResourceList.jsx` if it isn't already imported (needed for `React.Fragment`).

- [ ] **Step 5: Open the dashboard and verify**

```bash
npm run dev
```

1. Provision a database resource (or use an existing one). Click "Show details" — connection string fields appear.
2. Provision a Kubernetes cluster. Once active, click "Show details" → "Get Kubeconfig" — YAML appears with a copy button.

- [ ] **Step 6: Commit**

```bash
git add src/context/DashboardContext.jsx src/pages/dashboard/ResourceList.jsx
git commit -m "feat: show DB connection string and K8s kubeconfig in ResourceList"
```

---

## Self-Review Checklist

After all tasks are complete, run:

```bash
npm test
```

Expected: all tests pass (17+ tests across the three provider test files plus existing payment tests).

Then verify each item from the spec's Definition of Done:

- [ ] VPS, GPU, Game Server provision via DO `/v2/droplets`
- [ ] Kubernetes provisions via DO `/v2/kubernetes/clusters`
- [ ] Database provisions via DO `/v2/databases`
- [ ] `syncResourceStatus` works for all types (dispatches by serviceType)
- [ ] `delete` lifecycle action works for all types
- [ ] `suspend`/`resume` returns user-facing error for K8s and Database
- [ ] Service catalog migration applied; quotes return real prices in `NewService.jsx`
- [ ] `NewService.jsx` shows all 5 service types with correct plan codes
- [ ] `Database.jsx` resource row shows connection string when available
- [ ] `Kubernetes.jsx` resource row shows kubeconfig button when cluster is active
