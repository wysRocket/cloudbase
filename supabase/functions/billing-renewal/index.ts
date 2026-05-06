import { jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { triggerWorker } from "../_shared/worker.ts";

Deno.serve(async (request) => {
	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405, request);
	}

	const workerSecret = Deno.env.get("PROVISION_WORKER_SECRET");
	const incoming = request.headers.get("x-worker-secret");
	if (!workerSecret || incoming !== workerSecret) {
		return jsonResponse({ error: "Unauthorized." }, 401, request);
	}

	const adminClient = createAdminClient();

	const { data, error } = await adminClient.rpc("process_recurring_billing");

	if (error) {
		return jsonResponse({ error: error.message }, 500, request);
	}

	// If any resources were suspended, trigger the worker to process those suspension jobs
	if (data?.suspended > 0) {
		await triggerWorker();
	}

	return jsonResponse({ ok: true, result: data }, 200, request);
});
