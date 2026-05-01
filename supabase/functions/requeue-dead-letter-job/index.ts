import { jsonResponse } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") {
		return jsonResponse({ ok: true }, 200, request);
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405, request);
	}

	const authHeader = request.headers.get("Authorization");
	if (!authHeader) {
		return jsonResponse({ error: "Missing Authorization header" }, 401, request);
	}

	let body: { jobId?: number; reason?: string };
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "Invalid JSON body" }, 400, request);
	}

	if (!body.jobId || !Number.isInteger(body.jobId)) {
		return jsonResponse({ error: "jobId must be an integer" }, 400, request);
	}

	const client = createUserClient(authHeader);
	const { data, error } = await client.rpc("requeue_dead_letter_provision_job", {
		p_job_id: body.jobId,
		p_reason: body.reason ?? "manual_requeue",
	});

	if (error) {
		const isForbidden = /admin access required/i.test(error.message);
		return jsonResponse(
			{ error: error.message },
			isForbidden ? 403 : 400,
			request,
		);
	}

	return jsonResponse({ job: data }, 200, request);
});
