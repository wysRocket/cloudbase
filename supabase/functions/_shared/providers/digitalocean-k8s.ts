import type {
	LifecycleArgs,
	ProvisionArgs,
	ProvisionResult,
	SyncArgs,
	SyncResult,
} from "./digitalocean-api.ts";
import { buildResourceTags } from "./digitalocean-api.ts";

const FALLBACK_K8S_VERSION = "1.32.2-do.0";
const DEFAULT_NODE_SIZE = "s-2vcpu-4gb";
const BASE_URL = "https://api.digitalocean.com/v2";
const VERSION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cachedK8sVersion: string | null = null;
let versionCacheExpiresAt = 0;

/** Exported for test teardown — clears the in-memory version cache. */
export function clearK8sVersionCache(): void {
	cachedK8sVersion = null;
	versionCacheExpiresAt = 0;
}

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
	if (!res.ok)
		throw new Error(`DO API ${res.status}: ${JSON.stringify(payload)}`);
	return payload as T;
}

async function getDefaultK8sVersion(): Promise<string> {
	const now = Date.now();
	if (cachedK8sVersion && now < versionCacheExpiresAt) {
		return cachedK8sVersion;
	}
	try {
		const opts = await apiRequest<{
			options: { default_cluster_version: string };
		}>("/kubernetes/options");
		cachedK8sVersion = opts.options.default_cluster_version;
		versionCacheExpiresAt = now + VERSION_CACHE_TTL_MS;
		return cachedK8sVersion;
	} catch {
		return cachedK8sVersion ?? FALLBACK_K8S_VERSION;
	}
}

function mapState(state: string): string {
	if (state === "running") return "active";
	if (state === "degraded") return "error";
	if (state === "deleted" || state === "terminating") return "deleted";
	return "provisioning";
}

export async function provisionK8s(
	args: ProvisionArgs,
): Promise<ProvisionResult> {
	const nodeSize = String(args.metadata.nodeSize ?? DEFAULT_NODE_SIZE);
	const version = await getDefaultK8sVersion();

	const created = await apiRequest<{
		kubernetes_cluster: { id: string; status: { state: string } };
	}>("/kubernetes/clusters", {
		method: "POST",
		body: JSON.stringify({
			name: args.displayName,
			region: args.region,
			version,
			node_pools: [{ size: nodeSize, name: "default", count: 1 }],
			tags: buildResourceTags(args, "kubernetes"),
		}),
	});

	const cluster = created.kubernetes_cluster;
	return {
		providerResourceId: cluster.id,
		normalizedStatus: mapState(cluster.status.state),
	};
}

export async function executeK8sLifecycle(
	args: LifecycleArgs,
): Promise<string> {
	if (args.action === "suspend" || args.action === "resume") {
		throw new Error(
			"Kubernetes clusters cannot be suspended — delete and recreate instead.",
		);
	}

	if (args.action === "delete") {
		await apiRequest(`/kubernetes/clusters/${args.providerResourceId}`, {
			method: "DELETE",
		});
		return "deleted";
	}

	throw new Error(
		`Unsupported lifecycle action '${args.action}' for Kubernetes clusters.`,
	);
}

export async function syncK8sStatus(args: SyncArgs): Promise<SyncResult> {
	const result = await apiRequest<{
		kubernetes_cluster: { id: string; status: { state: string } };
	}>(`/kubernetes/clusters/${args.providerResourceId}`);

	return {
		status: mapState(result.kubernetes_cluster.status.state),
	};
}
