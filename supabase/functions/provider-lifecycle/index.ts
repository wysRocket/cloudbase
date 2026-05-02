import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

type LifecycleAction = "suspend" | "resume" | "resize" | "delete";

function parsePayload(body: unknown): { resourceId: string; action: LifecycleAction; idempotencyKey: string } {
	const resourceId = String((body as Record<string, unknown>)?.resourceId || "").trim();
	const action = String((body as Record<string, unknown>)?.action || "").trim() as LifecycleAction;
	const idempotencyKey = String((body as Record<string, unknown>)?.idempotencyKey || "").trim();
	if (!resourceId) throw new Error("resourceId is required.");
	if (!idempotencyKey) throw new Error("idempotencyKey is required.");
	if (!["suspend", "resume", "resize", "delete"].includes(action)) throw new Error("Invalid lifecycle action.");
	return { resourceId, action, idempotencyKey };
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

		const input = parsePayload(await request.json());
		const { data: resource } = await adminClient
			.from("service_resources")
			.select("id, user_id")
			.eq("id", input.resourceId)
			.eq("user_id", user.id)
			.maybeSingle();
		if (!resource) return jsonResponse({ error: "Resource not found." }, 404, request);

		const { data: existingJob } = await adminClient
			.from("provision_jobs")
			.select("id")
			.eq("idempotency_key", input.idempotencyKey)
			.eq("resource_id", input.resourceId)
			.eq("action", input.action)
			.maybeSingle();
		if (existingJob) return jsonResponse({ status: "accepted", jobId: existingJob.id, deduplicated: true }, 202, request);

		const { data: job, error: insertError } = await adminClient
			.from("provision_jobs")
			.insert({
				resource_id: input.resourceId,
				action: input.action,
				idempotency_key: input.idempotencyKey,
				status: "queued",
				request_payload: { action: input.action },
			})
			.select("id")
			.single();
		if (insertError) return jsonResponse({ error: insertError.message }, 500, request);

		return jsonResponse({ status: "accepted", jobId: job.id, deduplicated: false }, 202, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 422, request);
	}
});
