import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

type ProvisionRequest = {
	resourceId: string;
	idempotencyKey: string;
};

function parseProvisionRequest(body: unknown): ProvisionRequest {
	const resourceId = String((body as Record<string, unknown>)?.resourceId || "").trim();
	const idempotencyKey = String((body as Record<string, unknown>)?.idempotencyKey || "").trim();
	if (!resourceId) throw new Error("resourceId is required.");
	if (!idempotencyKey) throw new Error("idempotencyKey is required.");
	return { resourceId, idempotencyKey };
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

		const input = parseProvisionRequest(await request.json());
		const { data: resource, error: resourceError } = await adminClient
			.from("service_resources")
			.select("id, user_id, status")
			.eq("id", input.resourceId)
			.eq("user_id", user.id)
			.maybeSingle();

		if (resourceError) return jsonResponse({ error: resourceError.message }, 500, request);
		if (!resource) return jsonResponse({ error: "Resource not found." }, 404, request);

		const { data: existingJob } = await adminClient
			.from("provision_jobs")
			.select("id, status")
			.eq("idempotency_key", input.idempotencyKey)
			.eq("resource_id", input.resourceId)
			.maybeSingle();

		if (existingJob) {
			return jsonResponse({ status: "accepted", jobId: existingJob.id, deduplicated: true }, 202, request);
		}

		const { data: job, error: insertError } = await adminClient
			.from("provision_jobs")
			.insert({
				resource_id: input.resourceId,
				action: "provision",
				idempotency_key: input.idempotencyKey,
				status: "queued",
				request_payload: {},
			})
			.select("id")
			.single();

		if (insertError) return jsonResponse({ error: insertError.message }, 500, request);
		return jsonResponse({ status: "accepted", jobId: job.id, deduplicated: false }, 202, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 422, request);
	}
});
