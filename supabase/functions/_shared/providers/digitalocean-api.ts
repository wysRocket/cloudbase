export type ServiceType = "kubernetes" | "managed_database" | "gpu";

export type NormalizedServiceStatus =
	| "pending"
	| "provisioning"
	| "active"
	| "degraded"
	| "suspended"
	| "error"
	| "deleted";

export type ResourceMetadata = Record<string, unknown>;

function requiredEnv(name: string) {
	const value = Deno.env.get(name);
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

function doApi(path: string, init?: RequestInit) {
	return fetch(`https://api.digitalocean.com/v2${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${requiredEnv("DIGITALOCEAN_TOKEN")}`,
			"Content-Type": "application/json",
			...(init?.headers || {}),
		},
	});
}

export function normalizeDoStatus(raw: string | null | undefined): NormalizedServiceStatus {
	const v = String(raw || "").toLowerCase();
	if (["new", "queued", "requested"].includes(v)) return "pending";
	if (["provisioning", "creating", "resizing", "in-progress", "running"].includes(v)) return "provisioning";
	if (["active", "online", "ok", "healthy"].includes(v)) return "active";
	if (["warning", "degraded"].includes(v)) return "degraded";
	if (["off", "stopped", "suspended"].includes(v)) return "suspended";
	if (["archived", "deleted", "destroyed", "terminated"].includes(v)) return "deleted";
	return "error";
}

export async function createKubernetesCluster(input: {
	name: string;
	region: string;
	version: string;
	nodePoolName: string;
	nodeSize: string;
	nodeCount: number;
	tags?: string[];
}) {
	const response = await doApi("/kubernetes/clusters", {
		method: "POST",
		body: JSON.stringify({
			name: input.name,
			region: input.region,
			version: input.version,
			node_pools: [{ name: input.nodePoolName, size: input.nodeSize, count: input.nodeCount }],
			tags: input.tags || [],
		}),
	});
	const payload = await response.json();
	return {
		providerId: payload?.kubernetes_cluster?.id as string,
		status: normalizeDoStatus(payload?.kubernetes_cluster?.status?.state),
		metadata: {
			provider: "digitalocean",
			service_family: "kubernetes",
			cluster_name: payload?.kubernetes_cluster?.name,
			raw: payload,
		} satisfies ResourceMetadata,
	};
}

export async function getKubernetesCluster(clusterId: string) {
	const response = await doApi(`/kubernetes/clusters/${clusterId}`);
	if (response.status === 404) return { status: "deleted" as const, metadata: { provider_cluster_id: clusterId } };
	const payload = await response.json();
	return {
		providerId: payload?.kubernetes_cluster?.id as string,
		status: normalizeDoStatus(payload?.kubernetes_cluster?.status?.state),
		metadata: {
			provider: "digitalocean",
			service_family: "kubernetes",
			endpoint: payload?.kubernetes_cluster?.endpoint,
			version: payload?.kubernetes_cluster?.version,
			raw: payload,
		} satisfies ResourceMetadata,
	};
}

export async function deleteKubernetesCluster(clusterId: string) {
	await doApi(`/kubernetes/clusters/${clusterId}`, { method: "DELETE" });
	return { status: "deleted" as const, metadata: { provider_cluster_id: clusterId } };
}

export async function createManagedDbCluster(input: {
	name: string;
	engine: "pg" | "mysql" | "redis";
	version: string;
	region: string;
	size: string;
	nodeCount: number;
}) {
	const response = await doApi("/databases", {
		method: "POST",
		body: JSON.stringify({
			name: input.name,
			engine: input.engine,
			version: input.version,
			region: input.region,
			size: input.size,
			num_nodes: input.nodeCount,
		}),
	});
	const payload = await response.json();
	return {
		providerId: payload?.database?.id as string,
		status: normalizeDoStatus(payload?.database?.status),
		metadata: {
			provider: "digitalocean",
			service_family: "managed_database",
			engine: payload?.database?.engine,
			uri: payload?.database?.connection?.uri,
			raw: payload,
		} satisfies ResourceMetadata,
	};
}

export async function getManagedDbCluster(databaseId: string) {
	const response = await doApi(`/databases/${databaseId}`);
	if (response.status === 404) return { status: "deleted" as const, metadata: { provider_database_id: databaseId } };
	const payload = await response.json();
	return {
		providerId: payload?.database?.id as string,
		status: normalizeDoStatus(payload?.database?.status),
		metadata: {
			provider: "digitalocean",
			service_family: "managed_database",
			private_uri: payload?.database?.private_connection?.uri,
			raw: payload,
		} satisfies ResourceMetadata,
	};
}

export async function deleteManagedDbCluster(databaseId: string) {
	await doApi(`/databases/${databaseId}`, { method: "DELETE" });
	return { status: "deleted" as const, metadata: { provider_database_id: databaseId } };
}

const GPU_SIZE_MAP: Record<string, string> = {
	"nvidia-l40s-1x": "g-2vcpu-24gb",
	"nvidia-h100-1x": "g-8vcpu-160gb",
};

const GPU_IMAGE_MAP: Record<string, string> = {
	"pytorch-2.4": "gpu-pytorch-2-4-ubuntu-22-04",
	"cuda-12": "gpu-cuda-12-ubuntu-22-04",
};

export function resolveGpuDropletConfig(requestedSize: string, requestedImage: string) {
	return {
		size: GPU_SIZE_MAP[requestedSize] || requestedSize,
		image: GPU_IMAGE_MAP[requestedImage] || requestedImage,
	};
}
