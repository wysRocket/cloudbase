import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { digitalOceanAdapter } from "../_shared/digitalocean.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

	try {
		const body = await request.json();
		const action = String(body?.action || "").toLowerCase() as "start"|"stop"|"resize"|"delete";
		if (!["start", "stop", "resize", "delete"].includes(action)) {
			return jsonResponse({ error: "Invalid action." }, 400, request);
		}
		const id = String(body?.id || "");
		const idempotencyKey = String(body?.idempotencyKey || crypto.randomUUID());
		const service = await digitalOceanAdapter.compute.lifecycle(id, action, idempotencyKey, body?.size);
		return jsonResponse({ service, idempotencyKey: action === "delete" ? idempotencyKey : undefined }, 200, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Unable to apply lifecycle action." }, 500, request);
	}
});
