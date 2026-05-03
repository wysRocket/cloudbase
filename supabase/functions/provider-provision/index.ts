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
			.select("id, user_id, status, region, metadata")
			.eq("id", input.resourceId)
			.eq("user_id", user.id)
			.maybeSingle();

		if (resourceError) return jsonResponse({ error: resourceError.message }, 500, request);
		if (!resource) return jsonResponse({ error: "Resource not found." }, 404, request);

		// Look up the authoritative sell price from the service catalog.
		// Try the regional plan code first (e.g. do-vps-basic-2vcpu-4gb-nyc3),
		// then fall back to the base plan code for backward compatibility.
		const basePlanCode = String((resource.metadata as Record<string, unknown>)?.planCode || "");
		const region = String(resource.region || "");
		const regionalPlanCode = basePlanCode && region ? `${basePlanCode}-${region}` : "";

		let catalogEntry: { sell_price_cents: number; display_name: string; billing_cycle: string } | null = null;

		if (regionalPlanCode) {
			const { data } = await adminClient
				.from("service_catalog")
				.select("sell_price_cents, display_name, billing_cycle")
				.eq("plan_code", regionalPlanCode)
				.eq("is_active", true)
				.maybeSingle();
			catalogEntry = data;
		}

		if (!catalogEntry && basePlanCode) {
			const { data } = await adminClient
				.from("service_catalog")
				.select("sell_price_cents, display_name, billing_cycle")
				.eq("plan_code", basePlanCode)
				.eq("is_active", true)
				.maybeSingle();
			catalogEntry = data;
		}

		if (!catalogEntry) {
			return jsonResponse({ error: "No active catalog entry found for this resource." }, 422, request);
		}

		const creditsToDeduct = catalogEntry.sell_price_cents;
		const creditDescription = `${catalogEntry.display_name} deployment`;

		// Atomically check balance, deduct credits, and enqueue the provision job.
		// The RPC handles idempotency: it returns the existing job id if the job
		// was already created for this (resource_id, idempotency_key) pair.
		const { data: jobId, error: rpcError } = await adminClient.rpc(
			"deduct_credits_and_enqueue_provision",
			{
				p_user_id: user.id,
				p_resource_id: input.resourceId,
				p_idempotency_key: input.idempotencyKey,
				p_amount: creditsToDeduct,
				p_description: creditDescription,
			},
		);

		if (rpcError) {
			if (rpcError.message?.includes("insufficient_balance")) {
				return jsonResponse({ error: "Insufficient credit balance." }, 402, request);
			}
			return jsonResponse({ error: rpcError.message }, 500, request);
		}

		// Kick off the worker immediately so the job isn't waiting for a cron tick.
		await triggerWorker();

		return jsonResponse({ status: "accepted", jobId, deduplicated: false }, 202, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Invalid request." }, 422, request);
	}
});
