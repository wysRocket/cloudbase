import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

const BASE_URL = "https://api.digitalocean.com/v2";

function getToken(): string {
	const token = Deno.env.get("DIGITALOCEAN_API_TOKEN");
	if (!token) throw new Error("Missing DIGITALOCEAN_API_TOKEN.");
	return token;
}

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
			.select("provider_resource_id, service_type")
			.eq("id", resourceId)
			.eq("user_id", user.id)
			.maybeSingle();
		if (error) return jsonResponse({ error: error.message }, 500, request);
		if (!resource) return jsonResponse({ error: "Resource not found." }, 404, request);

		if (resource.service_type !== "kubernetes") {
			return jsonResponse({ error: "Resource is not a Kubernetes cluster." }, 422, request);
		}
		if (!resource.provider_resource_id) {
			return jsonResponse({ error: "Cluster is not yet provisioned." }, 422, request);
		}

		const doRes = await fetch(
			`${BASE_URL}/kubernetes/clusters/${resource.provider_resource_id}/kubeconfig`,
			{
				headers: {
					Authorization: `Bearer ${getToken()}`,
				},
			},
		);

		if (!doRes.ok) {
			const text = await doRes.text();
			return jsonResponse({ error: `DO API ${doRes.status}: ${text}` }, 502, request);
		}

		const kubeconfigYaml = await doRes.text();

		return new Response(kubeconfigYaml, {
			status: 200,
			headers: {
				"Content-Type": "text/plain",
				...getCorsHeaders(request),
			},
		});
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 500, request);
	}
});
