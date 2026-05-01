import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { digitalOceanAdapter } from "../_shared/digitalocean.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

	try {
		const body = await request.json();
		const idempotencyKey = String(body?.idempotencyKey || crypto.randomUUID());
		const service = await digitalOceanAdapter.compute.provision({
			name: String(body?.name || ""),
			region: String(body?.region || ""),
			size: String(body?.size || ""),
			image: String(body?.image || "ubuntu-24-04-x64"),
			tags: Array.isArray(body?.tags) ? body.tags : [],
		}, idempotencyKey);
		return jsonResponse({ service, idempotencyKey }, 200, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Unable to provision service." }, 500, request);
	}
});
