import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: getCorsHeaders(request) });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405, request);
	}

	try {
		const authHeader = request.headers.get("Authorization");
		const userClient = createUserClient(authHeader);
		const adminClient = createAdminClient();

		const {
			data: { user },
			error: userError,
		} = await userClient.auth.getUser();

		if (userError || !user) {
			return jsonResponse({ error: "Unauthorized." }, 401, request);
		}

		const { data: adminRole, error: roleError } = await adminClient
			.from("user_roles")
			.select("role")
			.eq("user_id", user.id)
			.eq("role", "admin")
			.maybeSingle();

		if (roleError || !adminRole) {
			return jsonResponse({ error: "Admin access required." }, 403, request);
		}

		const body = await request.json();
		const jobId = String(body?.jobId || "").trim();

		if (!jobId) {
			return jsonResponse({ error: "jobId is required." }, 400, request);
		}

		const { data: job, error: jobError } = await adminClient
			.from("provision_jobs")
			.select("id, status, attempts, max_attempts")
			.eq("id", jobId)
			.maybeSingle();

		if (jobError || !job) {
			return jsonResponse({ error: "Job not found." }, 404, request);
		}

		if (job.status !== "dead_letter") {
			return jsonResponse({ error: "Only dead-letter jobs can be requeued." }, 409, request);
		}

		const { data: updatedJob, error: updateError } = await adminClient
			.from("provision_jobs")
			.update({
				status: "queued",
				locked_at: null,
				locked_by: null,
				available_at: new Date().toISOString(),
				finished_at: null,
				attempts: Math.min(job.attempts, Math.max(job.max_attempts - 1, 0)),
			})
			.eq("id", jobId)
			.eq("status", "dead_letter")
			.select("id, status, attempts, max_attempts")
			.maybeSingle();

		if (updateError || !updatedJob) {
			return jsonResponse(
				{ error: "Unable to requeue job.", details: updateError?.message },
				500,
				request,
			);
		}

		await adminClient.from("provision_events").insert({
			job_id: updatedJob.id,
			event_type: "job.requeued",
			message: "Dead-letter job requeued by admin",
			metadata: {
				requeued_by: user.id,
				previous_attempts: job.attempts,
				new_attempts: updatedJob.attempts,
			},
		});

		return jsonResponse({ job: updatedJob }, 200, request);
	} catch (error) {
		return jsonResponse(
			{ error: "Failed to requeue dead-letter job.", details: error instanceof Error ? error.message : String(error) },
			500,
			request,
		);
	}
});
