import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";
import { syncResourceStatus } from "../_shared/providers/digitalocean-api.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

	try {
		const authHeader = request.headers.get("Authorization");
		const userClient = createUserClient(authHeader);
		const adminClient = createAdminClient();
		const { data: { user }, error: userError } = await userClient.auth.getUser();
		if (userError || !user) return jsonResponse({ error: "You must be signed in." }, 401, request);

		const body = (await request.json()) as Record<string, unknown>;
		const resourceId = String(body?.resourceId || "").trim();
		if (!resourceId) return jsonResponse({ error: "resourceId is required." }, 422, request);

		const { data: resource, error } = await adminClient
			.from("service_resources")
			.select("id, status, updated_at, provider_resource_id")
			.eq("id", resourceId)
			.eq("user_id", user.id)
			.maybeSingle();
		if (error) return jsonResponse({ error: error.message }, 500, request);
		if (!resource) return jsonResponse({ error: "Resource not found." }, 404, request);

		let normalizedStatus = resource.status;
		if (resource.provider_resource_id) {
			normalizedStatus = await syncResourceStatus(String(resource.provider_resource_id));
			await adminClient.from("service_resources").update({ status: normalizedStatus }).eq("id", resourceId);
		}

		return jsonResponse({ normalizedStatus, updatedAt: new Date().toISOString() }, 200, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 422, request);
	}
});
