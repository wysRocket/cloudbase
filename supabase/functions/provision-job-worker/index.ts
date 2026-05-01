import {
	createKubernetesCluster,
	createManagedDbCluster,
	deleteKubernetesCluster,
	deleteManagedDbCluster,
	getKubernetesCluster,
	getManagedDbCluster,
	resolveGpuDropletConfig,
	type NormalizedServiceStatus,
	type ServiceType,
} from "../_shared/providers/digitalocean-api.ts";

interface ProvisionJob {
	service_type: ServiceType;
	action: "provision" | "lifecycle" | "sync";
	provider_resource_id?: string;
	payload?: Record<string, unknown>;
}

interface HandlerResult {
	provider_resource_id?: string;
	status: NormalizedServiceStatus;
	metadata?: Record<string, unknown>;
}

function json(data: unknown, code = 200) {
	return new Response(JSON.stringify(data), {
		status: code,
		headers: { "Content-Type": "application/json" },
	});
}

const handlers: Record<ServiceType, Record<ProvisionJob["action"], (job: ProvisionJob) => Promise<HandlerResult>>> = {
	kubernetes: {
		provision: async (job) => {
			const payload = job.payload || {};
			const result = await createKubernetesCluster({
				name: String(payload.name),
				region: String(payload.region),
				version: String(payload.version),
				nodePoolName: String(payload.node_pool_name || "default-pool"),
				nodeSize: String(payload.node_size),
				nodeCount: Number(payload.node_count || 1),
				tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
			});
			return { provider_resource_id: result.providerId, status: result.status, metadata: result.metadata };
		},
		lifecycle: async (job) => {
			if (!job.provider_resource_id) throw new Error("Missing provider_resource_id");
			const result = await deleteKubernetesCluster(job.provider_resource_id);
			return { provider_resource_id: job.provider_resource_id, status: result.status, metadata: result.metadata };
		},
		sync: async (job) => {
			if (!job.provider_resource_id) throw new Error("Missing provider_resource_id");
			const result = await getKubernetesCluster(job.provider_resource_id);
			return { provider_resource_id: result.providerId || job.provider_resource_id, status: result.status, metadata: result.metadata };
		},
	},
	managed_database: {
		provision: async (job) => {
			const payload = job.payload || {};
			const result = await createManagedDbCluster({
				name: String(payload.name),
				engine: String(payload.engine || "pg") as "pg" | "mysql" | "redis",
				version: String(payload.version),
				region: String(payload.region),
				size: String(payload.size),
				nodeCount: Number(payload.node_count || 1),
			});
			return { provider_resource_id: result.providerId, status: result.status, metadata: result.metadata };
		},
		lifecycle: async (job) => {
			if (!job.provider_resource_id) throw new Error("Missing provider_resource_id");
			const result = await deleteManagedDbCluster(job.provider_resource_id);
			return { provider_resource_id: job.provider_resource_id, status: result.status, metadata: result.metadata };
		},
		sync: async (job) => {
			if (!job.provider_resource_id) throw new Error("Missing provider_resource_id");
			const result = await getManagedDbCluster(job.provider_resource_id);
			return { provider_resource_id: result.providerId || job.provider_resource_id, status: result.status, metadata: result.metadata };
		},
	},
	gpu: {
		provision: async (job) => {
			const payload = job.payload || {};
			const gpu = resolveGpuDropletConfig(String(payload.size), String(payload.image));
			return {
				status: "pending",
				metadata: {
					provider: "digitalocean",
					service_family: "gpu",
					resolved_size: gpu.size,
					resolved_image: gpu.image,
					provider_droplet_id: null,
				},
			};
		},
		lifecycle: async () => ({ status: "deleted", metadata: { service_family: "gpu" } }),
		sync: async (job) => ({ status: "active", metadata: { service_family: "gpu", provider_droplet_id: job.provider_resource_id || null } }),
	},
};

Deno.serve(async (request) => {
	if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
	try {
		const job = (await request.json()) as ProvisionJob;
		const serviceHandlers = handlers[job.service_type];
		if (!serviceHandlers) return json({ error: `Unsupported service_type: ${job.service_type}` }, 400);
		const actionHandler = serviceHandlers[job.action];
		if (!actionHandler) return json({ error: `Unsupported action: ${job.action}` }, 400);
		const result = await actionHandler(job);

		// Persisting provider identifiers and metadata contract shape for service_resources.
		return json({
			service_type: job.service_type,
			action: job.action,
			status: result.status,
			service_resources_update: {
				provider_resource_id: result.provider_resource_id || job.provider_resource_id || null,
				metadata: result.metadata || {},
			},
		});
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : String(error) }, 500);
	}
});
