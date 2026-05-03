const BASE_URL = "https://api.digitalocean.com/v2";

function getToken() {
	const token = Deno.env.get("DIGITALOCEAN_API_TOKEN");
	if (!token) throw new Error("Missing DIGITALOCEAN_API_TOKEN.");
	return token;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${BASE_URL}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${getToken()}`,
			"Content-Type": "application/json",
			...(init?.headers || {}),
		},
	});

	const text = await response.text();
	let payload: unknown = null;
	if (text) {
		try {
			payload = JSON.parse(text);
		} catch {
			payload = { raw: text };
		}
	}

	if (!response.ok) {
		throw new Error(`DigitalOcean API error ${response.status}: ${JSON.stringify(payload)}`);
	}

	return payload as T;
}

/**
 * Normalize DigitalOcean droplet statuses to the app's public.resource_status enum values.
 * DO can return: "new" | "active" | "off" | "archive"
 */
function normalizeDOStatus(status: string): string {
	if (status === "active") return "active";
	if (status === "off") return "suspended";
	if (status === "archive") return "deleted";
	// "new" and any other transitional states map to provisioning
	return "provisioning";
}

export type ProvisionArgs = {
	serviceType: string;
	region: string;
	displayName: string;
	metadata: Record<string, unknown>;
};

export async function provisionResource(args: ProvisionArgs): Promise<{ providerResourceId: string; normalizedStatus: string }> {
	if (args.serviceType === "vps" || args.serviceType === "gpu") {
		const size = String(args.metadata.sizeSlug || "s-1vcpu-2gb");
		const image = String(args.metadata.imageSlug || "ubuntu-22-04-x64");

		const created = await apiRequest<{ droplet: { id: number; status: string } }>("/droplets", {
			method: "POST",
			body: JSON.stringify({
				name: args.displayName,
				region: args.region,
				size,
				image,
				monitoring: true,
			}),
		});

		return { providerResourceId: String(created.droplet.id), normalizedStatus: normalizeDOStatus(created.droplet.status) };
	}

	if (args.serviceType === "kubernetes") {
		const version = String(args.metadata.version || "1.30");
		const nodeSize = String(
			args.metadata.nodeSize || args.metadata.node_size || "s-2vcpu-4gb",
		);
		const nodeCount = Number(args.metadata.nodeCount ?? args.metadata.node_count ?? 3);

		if (!Number.isInteger(nodeCount) || nodeCount < 1 || nodeCount > 100) {
			throw new Error("Invalid kubernetes nodeCount; expected integer 1-100.");
		}

		const created = await apiRequest<{ kubernetes_cluster: { id: string; status: { state: string } } }>("/kubernetes/clusters", {
			method: "POST",
			body: JSON.stringify({
				name: args.displayName,
				region: args.region,
				version,
				node_pools: [
					{
						name: "default-pool",
						size: nodeSize,
						count: nodeCount,
						auto_scale: false,
					},
				],
			}),
		});

		const state = String(created.kubernetes_cluster.status?.state || "provisioning").toLowerCase();
		const normalizedStatus = state === "running" ? "active" : "provisioning";
		return { providerResourceId: created.kubernetes_cluster.id, normalizedStatus };
	}

	if (args.serviceType === "database") {
		const engine = String(args.metadata.engine || "pg");
		const version = String(args.metadata.version || "16");
		const size = String(args.metadata.sizeSlug || args.metadata.size || "db-s-2vcpu-4gb");
		const nodeCount = Number(args.metadata.nodeCount ?? args.metadata.node_count ?? 1);
		const dbName = String(args.metadata.dbName || args.metadata.db_name || "defaultdb");

		if (!Number.isInteger(nodeCount) || nodeCount < 1 || nodeCount > 10) {
			throw new Error("Invalid database nodeCount; expected integer 1-10.");
		}

		const created = await apiRequest<{ database: { id: string; status: string } }>("/databases", {
			method: "POST",
			body: JSON.stringify({
				name: args.displayName,
				engine,
				version,
				region: args.region,
				size,
				num_nodes: nodeCount,
				db_names: [dbName],
			}),
		});

		const status = String(created.database.status || "creating").toLowerCase();
		const normalizedStatus = status === "online" ? "active" : "provisioning";
		return { providerResourceId: created.database.id, normalizedStatus };
	}

	throw new Error(`Provisioning for service type '${args.serviceType}' is not implemented yet.`);
}

export async function executeLifecycleAction(args: { action: string; serviceType: string; providerResourceId: string }): Promise<string> {
	const id = args.providerResourceId;

	if (args.serviceType === "vps" || args.serviceType === "gpu") {
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
			case "resize":
				throw new Error("Resize action is not yet implemented. Please contact support for manual resizing.");
			default:
				throw new Error(`Unsupported lifecycle action '${args.action}'.`);
		}
	}

	if (args.serviceType === "kubernetes") {
		switch (args.action) {
			case "delete":
				await apiRequest(`/kubernetes/clusters/${id}`, { method: "DELETE" });
				return "deleted";
			default:
				throw new Error(`Unsupported lifecycle action '${args.action}'.`);
		}
	}

	if (args.serviceType === "database") {
		switch (args.action) {
			case "delete":
				await apiRequest(`/databases/${id}`, { method: "DELETE" });
				return "deleted";
			default:
				throw new Error(`Unsupported lifecycle action '${args.action}'.`);
		}
	}

	throw new Error(`Lifecycle actions for service type '${args.serviceType}' are not implemented.`);
}

export async function syncResourceStatus(args: { serviceType: string; providerResourceId: string }): Promise<string> {
	const id = args.providerResourceId;

	if (args.serviceType === "vps" || args.serviceType === "gpu") {
		const result = await apiRequest<{ droplet: { status: string } }>(`/droplets/${id}`);
		return normalizeDOStatus(result.droplet.status);
	}

	if (args.serviceType === "kubernetes") {
		const result = await apiRequest<{ kubernetes_cluster: { status: { state: string } } }>(`/kubernetes/clusters/${id}`);
		const state = String(result.kubernetes_cluster.status?.state || "provisioning").toLowerCase();
		return state === "running" ? "active" : "provisioning";
	}

	if (args.serviceType === "database") {
		const result = await apiRequest<{ database: { status: string } }>(`/databases/${id}`);
		const status = String(result.database.status || "creating").toLowerCase();
		return status === "online" ? "active" : "provisioning";
	}

	throw new Error(`Status sync for service type '${args.serviceType}' is not implemented.`);
}
