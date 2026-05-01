import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { digitalOceanAdapter } from "../_shared/digitalocean.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

	try {
		const body = await request.json();
		const id = String(body?.id || "");
		const service = await digitalOceanAdapter.compute.getStatus(id);
		return jsonResponse({ service }, 200, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Unable to fetch service status." }, 500, request);
	}
});
