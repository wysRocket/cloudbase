const DEFAULT_K8S_VERSION = "1.32.2-do.0";
const DEFAULT_NODE_SIZE = "s-2vcpu-4gb";
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
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }
  if (!res.ok) throw new Error(`DO API ${res.status}: ${JSON.stringify(payload)}`);
  return payload as T;
}

interface ProvisionArgs {
  providerResourceId: string;
  displayName: string;
  region: string;
  metadata: Record<string, string>;
}

interface ProvisionResult {
  providerResourceId: string;
  status: string;
  connectionDetails?: Record<string, string>;
}

interface LifecycleArgs {
  providerResourceId: string;
  action: string;
}

interface SyncArgs {
  providerResourceId: string;
}

interface SyncResult {
  status: string;
  connectionDetails?: Record<string, string>;
}

function mapState(state: string): string {
  if (state === "running") return "active";
  if (state === "degraded") return "error";
  return "provisioning";
}

export async function provisionK8s(args: ProvisionArgs): Promise<ProvisionResult> {
  const nodeSize = args.metadata.nodeSize || DEFAULT_NODE_SIZE;

  const created = await apiRequest<{
    kubernetes_cluster: { id: string; status: { state: string } };
  }>("/kubernetes/clusters", {
    method: "POST",
    body: JSON.stringify({
      name: args.displayName,
      region: args.region,
      version: DEFAULT_K8S_VERSION,
      node_pools: [
        { size: nodeSize, name: "default", count: 1 },
      ],
    }),
  });

  const cluster = created.kubernetes_cluster;
  return {
    providerResourceId: cluster.id,
    status: mapState(cluster.status.state),
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
    kubernetes_cluster: { id: string; status: { state: string } };
  }>(`/kubernetes/clusters/${args.providerResourceId}`);

  return {
    status: mapState(result.kubernetes_cluster.status.state),
  };
}
