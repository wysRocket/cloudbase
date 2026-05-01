import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

type ProvisionJob = {
	id: string;
	status: string;
	attempt_count: number;
	next_run_at: string;
	locked_at: string | null;
	locked_by: string | null;
	max_attempts: number;
	provider_request: Record<string, unknown>;
};

const DEFAULT_BATCH_SIZE = Number(Deno.env.get("PROVISION_JOB_BATCH_SIZE") || "10");
const DEFAULT_LOCK_TIMEOUT_SECONDS = Number(
	Deno.env.get("PROVISION_JOB_LOCK_TIMEOUT_SECONDS") || "300",
);
const DEFAULT_BASE_RETRY_SECONDS = Number(
	Deno.env.get("PROVISION_JOB_RETRY_BASE_SECONDS") || "15",
);
const DEFAULT_MAX_RETRY_SECONDS = Number(
	Deno.env.get("PROVISION_JOB_RETRY_MAX_SECONDS") || "1800",
);

const workerId = Deno.env.get("PROVISION_WORKER_ID") || crypto.randomUUID();

function classifyProviderError(status: number, payload: Record<string, unknown>) {
	const errorCode = String(payload.error_code || payload.code || "unknown_error");
	const transientHttp = [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
	const transientCodes = new Set([
		"rate_limited",
		"timeout",
		"temporarily_unavailable",
		"network_error",
	]);

	const isTransient = transientHttp || transientCodes.has(errorCode);
	return { isTransient, errorCode };
}

function nextRetryAt(attemptCount: number) {
	const exponent = Math.max(0, attemptCount - 1);
	const baseDelay = DEFAULT_BASE_RETRY_SECONDS * 2 ** exponent;
	const bounded = Math.min(DEFAULT_MAX_RETRY_SECONDS, baseDelay);
	const jitterFactor = 0.5 + Math.random();
	const withJitter = Math.round(bounded * jitterFactor);
	const next = new Date(Date.now() + withJitter * 1_000);
	return next.toISOString();
}

async function appendProvisionEvent(
	adminClient: ReturnType<typeof createAdminClient>,
	jobId: string,
	eventType: string,
	payload: Record<string, unknown>,
) {
	await adminClient.from("provision_events").insert({
		job_id: jobId,
		event_type: eventType,
		payload,
	});
}

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: getCorsHeaders(request) });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405, request);
	}

	const adminClient = createAdminClient();
	const batchSize = DEFAULT_BATCH_SIZE;
	const lockTimeout = DEFAULT_LOCK_TIMEOUT_SECONDS;

	const { data: claimedJobs, error: claimError } = await adminClient.rpc(
		"claim_provision_jobs",
		{
			p_limit: batchSize,
			p_locked_by: workerId,
			p_lock_timeout_seconds: lockTimeout,
		},
	);

	if (claimError) {
		return jsonResponse(
			{ error: "Failed to claim provision jobs.", details: claimError.message },
			500,
			request,
		);
	}

	const jobs = (claimedJobs || []) as ProvisionJob[];
	const results: Array<Record<string, unknown>> = [];

	for (const job of jobs) {
		const requestId = crypto.randomUUID();
		try {
			const providerResponse = await fetch(String(job.provider_request.url || ""), {
				method: String(job.provider_request.method || "POST"),
				headers: (job.provider_request.headers as HeadersInit) || {
					"Content-Type": "application/json",
				},
				body: job.provider_request.body
					? JSON.stringify(job.provider_request.body)
					: undefined,
			});

			const providerJson = (await providerResponse.json().catch(() => ({}))) as Record<
				string,
				unknown
			>;

			if (providerResponse.ok) {
				await adminClient
					.from("provision_jobs")
					.update({
						status: "completed",
						locked_at: null,
						locked_by: null,
						last_error: null,
						completed_at: new Date().toISOString(),
					})
					.eq("id", job.id)
					.eq("locked_by", workerId);

				await appendProvisionEvent(adminClient, job.id, "completed", {
					request_id: requestId,
					provider_status: providerResponse.status,
					error_code: null,
				});

				results.push({ id: job.id, status: "completed" });
				continue;
			}

			const { isTransient, errorCode } = classifyProviderError(
				providerResponse.status,
				providerJson,
			);
			const nextAttempt = job.attempt_count + 1;
			const exhausted = nextAttempt >= job.max_attempts;
			const terminal = !isTransient || exhausted;

			if (terminal) {
				await adminClient
					.from("provision_jobs")
					.update({
						status: exhausted ? "dead_letter" : "failed",
						attempt_count: nextAttempt,
						locked_at: null,
						locked_by: null,
						last_error: errorCode,
					})
					.eq("id", job.id)
					.eq("locked_by", workerId);
			} else {
				await adminClient
					.from("provision_jobs")
					.update({
						status: "queued",
						attempt_count: nextAttempt,
						next_run_at: nextRetryAt(nextAttempt),
						locked_at: null,
						locked_by: null,
						last_error: errorCode,
					})
					.eq("id", job.id)
					.eq("locked_by", workerId);
			}

			await appendProvisionEvent(adminClient, job.id, "provider_error", {
				request_id: requestId,
				provider_status: providerResponse.status,
				error_code: errorCode,
				terminal,
				exhausted,
			});

			results.push({ id: job.id, status: terminal ? "failed" : "queued" });
		} catch (error) {
			const nextAttempt = job.attempt_count + 1;
			const exhausted = nextAttempt >= job.max_attempts;

			if (exhausted) {
				await adminClient
					.from("provision_jobs")
					.update({
						status: "dead_letter",
						attempt_count: nextAttempt,
						locked_at: null,
						locked_by: null,
						last_error: "runtime_exception",
					})
					.eq("id", job.id)
					.eq("locked_by", workerId);
			} else {
				await adminClient
					.from("provision_jobs")
					.update({
						status: "queued",
						attempt_count: nextAttempt,
						next_run_at: nextRetryAt(nextAttempt),
						locked_at: null,
						locked_by: null,
						last_error: "runtime_exception",
					})
					.eq("id", job.id)
					.eq("locked_by", workerId);
			}

			await appendProvisionEvent(adminClient, job.id, "runtime_error", {
				request_id: requestId,
				provider_status: null,
				error_code: "runtime_exception",
				message: error instanceof Error ? error.message : String(error),
				exhausted,
			});

			results.push({ id: job.id, status: exhausted ? "dead_letter" : "queued" });
		}
	}

	return jsonResponse({ claimed: jobs.length, results }, 200, request);
});
