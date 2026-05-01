import { providerEnv } from "./provider-env.ts";
import { ProvisionRequest, ProviderServicePayload, QuoteRequest } from "./provider.ts";

const DO_BASE = "https://api.digitalocean.com/v2";

function authHeaders(idempotencyKey?: string) {
	return {
		Authorization: `Bearer ${providerEnv.digitalOceanToken}`,
		"Content-Type": "application/json",
		...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
	};
}

function normalizeState(status?: string): ProviderServicePayload["state"] {
	if (!status) return "pending";
	if (["new", "in-progress", "off", "archive"].includes(status)) return "pending";
	if (["active", "running", "ok"].includes(status)) return "active";
	if (["deleting"].includes(status)) return "deleting";
	return "failed";
}

function sanitizeDroplet(droplet: Record<string, any>): ProviderServicePayload {
	return {
		id: String(droplet.id),
		name: droplet.name,
		region: droplet.region?.slug,
		size: droplet.size_slug,
		image: droplet.image?.slug,
		createdAt: droplet.created_at,
		ipv4: (droplet.networks?.v4 ?? []).map((n: any) => n.ip_address).filter(Boolean),
		state: normalizeState(droplet.status),
	};
}

async function doFetch(path: string, init?: RequestInit) {
	const response = await fetch(`${DO_BASE}${path}`, init);
	const text = await response.text();
	const json = text ? JSON.parse(text) : {};
	if (!response.ok) {
		throw new Error(json?.message || `DigitalOcean error (${response.status})`);
	}
	return json;
}

export const digitalOceanAdapter = {
	compute: {
		async quote(request: QuoteRequest) {
			const list = await doFetch("/sizes", { headers: authHeaders() });
			const target = (list.sizes ?? []).find((s: any) => s.slug === request.size);
			const hourly = Number(target?.price_hourly ?? 0);
			const monthly = Number(target?.price_monthly ?? 0);
			const quantity = Math.max(1, Number(request.quantity ?? 1));
			return {
				region: request.region,
				size: request.size,
				quantity,
				hourlyTotal: hourly * quantity,
				monthlyTotal: monthly * quantity,
				currency: "USD",
			};
		},
		async provision(request: ProvisionRequest, idempotencyKey: string) {
			const payload = await doFetch("/droplets", {
				method: "POST",
				headers: authHeaders(idempotencyKey),
				body: JSON.stringify({
					name: request.name,
					region: request.region,
					size: request.size,
					image: request.image,
					tags: request.tags ?? [],
				}),
			});
			return sanitizeDroplet(payload.droplet ?? {});
		},
		async getStatus(id: string) {
			const payload = await doFetch(`/droplets/${id}`, { headers: authHeaders() });
			return sanitizeDroplet(payload.droplet ?? {});
		},
		async lifecycle(id: string, action: "start"|"stop"|"resize"|"delete", idempotencyKey: string, resizeSize?: string) {
			if (action === "delete") {
				await doFetch(`/droplets/${id}`, { method: "DELETE", headers: authHeaders(idempotencyKey) });
				return { id, state: "deleting" as const };
			}
			const body = action === "resize" ? { type: "resize", size: resizeSize, disk: false } : { type: action === "start" ? "power_on" : "power_off" };
			await doFetch(`/droplets/${id}/actions`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
			return this.getStatus(id);
		},
	},
};
