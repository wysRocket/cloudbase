import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { digitalOceanAdapter } from "../_shared/digitalocean.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

	try {
		const body = await request.json();
		const quote = await digitalOceanAdapter.compute.quote({
			region: String(body?.region || ""),
			size: String(body?.size || ""),
			quantity: Number(body?.quantity ?? 1),
		});
		return jsonResponse({ quote }, 200, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Unable to create quote." }, 500, request);
	}
});
