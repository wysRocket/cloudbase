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
	if (args.serviceType !== "vps") {
		throw new Error(`Provisioning for service type '${args.serviceType}' is not implemented yet.`);
	}

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

export async function executeLifecycleAction(args: { action: string; providerResourceId: string }): Promise<string> {
	const dropletId = args.providerResourceId;
	if (!/^\d+$/.test(dropletId)) {
		throw new Error("Invalid provider resource ID format.");
	}
	switch (args.action) {
		case "suspend":
			await apiRequest(`/droplets/${dropletId}/actions`, { method: "POST", body: JSON.stringify({ type: "power_off" }) });
			return "suspended";
		case "resume":
			await apiRequest(`/droplets/${dropletId}/actions`, { method: "POST", body: JSON.stringify({ type: "power_on" }) });
			return "active";
		case "delete":
			await apiRequest(`/droplets/${dropletId}`, { method: "DELETE" });
			return "deleted";
		case "resize":
			throw new Error("Resize action is not yet implemented. Please contact support for manual resizing.");
		default:
			throw new Error(`Unsupported lifecycle action '${args.action}'.`);
	}
}

export async function syncResourceStatus(providerResourceId: string): Promise<string> {
	const result = await apiRequest<{ droplet: { status: string } }>(`/droplets/${providerResourceId}`);
	return normalizeDOStatus(result.droplet.status);
}
