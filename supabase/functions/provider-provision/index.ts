import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

type ProvisionRequest = {
	resourceId: string;
	idempotencyKey: string;
	creditsToDeduct: number;
	creditDescription: string;
};

function parseProvisionRequest(body: unknown): ProvisionRequest {
	const resourceId = String((body as Record<string, unknown>)?.resourceId || "").trim();
	const idempotencyKey = String((body as Record<string, unknown>)?.idempotencyKey || "").trim();
	const creditsToDeduct = Number((body as Record<string, unknown>)?.creditsToDeduct ?? 0);
	const creditDescription = String((body as Record<string, unknown>)?.creditDescription || "Service deployment").trim();

	if (!resourceId) throw new Error("resourceId is required.");
	if (!idempotencyKey) throw new Error("idempotencyKey is required.");
	if (!Number.isInteger(creditsToDeduct) || creditsToDeduct < 0) {
		throw new Error("creditsToDeduct must be a non-negative integer.");
	}
	return { resourceId, idempotencyKey, creditsToDeduct, creditDescription };
}

async function triggerWorker(): Promise<void> {
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const workerSecret = Deno.env.get("PROVISION_WORKER_SECRET");
	if (!supabaseUrl || !workerSecret) return;
	const workerUrl = `${supabaseUrl}/functions/v1/provision-job-worker`;
	// Fire-and-forget; if this fails the job will be picked up by the next scheduled run.
	fetch(workerUrl, {
		method: "POST",
		headers: { "x-worker-secret": workerSecret },
	}).catch(() => {});
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

		// Idempotency: return existing job if already enqueued for this resource.
		const { data: existingJob } = await adminClient
			.from("provision_jobs")
			.select("id, status")
			.eq("idempotency_key", input.idempotencyKey)
			.eq("resource_id", input.resourceId)
			.maybeSingle();

		if (existingJob) {
			return jsonResponse({ status: "accepted", jobId: existingJob.id, deduplicated: true }, 202, request);
		}

		// Atomically check balance and deduct credits before enqueuing the job.
		if (input.creditsToDeduct > 0) {
			const { error: deductError } = await adminClient.rpc("deduct_credits_for_provision", {
				p_user_id: user.id,
				p_amount: input.creditsToDeduct,
				p_description: input.creditDescription,
				p_resource_id: input.resourceId,
			});

			if (deductError) {
				if (deductError.message?.includes("insufficient_balance")) {
					return jsonResponse({ error: "Insufficient credit balance." }, 402, request);
				}
				return jsonResponse({ error: deductError.message }, 500, request);
			}
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

		// Kick off the worker immediately so the job isn't waiting for a cron tick.
		await triggerWorker();

		return jsonResponse({ status: "accepted", jobId: job.id, deduplicated: false }, 202, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 422, request);
	}
});
