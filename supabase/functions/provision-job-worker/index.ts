import { jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { executeLifecycleAction, provisionResource } from "../_shared/providers/digitalocean-api.ts";

Deno.serve(async (request) => {
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

	const workerSecret = Deno.env.get("PROVISION_WORKER_SECRET");
	const incoming = request.headers.get("x-worker-secret");
	if (!workerSecret || incoming !== workerSecret) {
		return jsonResponse({ error: "Unauthorized worker call." }, 401, request);
	}

	const adminClient = createAdminClient();
	const nowIso = new Date().toISOString();

	const { data: jobs, error: jobsError } = await adminClient
		.from("provision_jobs")
		.select("id, resource_id, action, attempt_count, max_attempts")
		.eq("status", "queued")
		.lte("next_run_at", nowIso)
		.order("created_at", { ascending: true })
		.limit(20);

	if (jobsError) return jsonResponse({ error: jobsError.message }, 500, request);

	let processed = 0;
	let failed = 0;
	let deadLettered = 0;

	for (const job of jobs || []) {
		processed += 1;
		const { data: lockResult } = await adminClient.from("provision_jobs").update({ status: "processing", locked_at: nowIso, locked_by: "provision-job-worker" }).eq("id", job.id).eq("status", "queued").select("id");
		if (!lockResult || lockResult.length === 0) continue;

		try {
			const { data: resource, error: resourceError } = await adminClient
				.from("service_resources")
				.select("id, service_type, provider_resource_id, display_name, region, metadata")
				.eq("id", job.resource_id)
				.single();
			if (resourceError || !resource) throw new Error(resourceError?.message || "Resource not found");

			if (resource.service_type === "kubernetes") {
				resource.metadata = {
					...(resource.metadata || {}),
					nodeSize: (resource.metadata as Record<string, unknown>)?.nodeSize || (resource.metadata as Record<string, unknown>)?.node_size,
					nodeCount: (resource.metadata as Record<string, unknown>)?.nodeCount || (resource.metadata as Record<string, unknown>)?.node_count,
				};
			}

			let targetStatus = "active";
			let providerResourceId = resource.provider_resource_id as string | null;

			if (job.action === "provision") {
				const provisioned = await provisionResource(String(resource.service_type), {
					providerResourceId: resource.provider_resource_id ?? "",
					region: resource.region,
					displayName: resource.display_name,
					metadata: (resource.metadata || {}) as Record<string, string>,
				});
				targetStatus = provisioned.normalizedStatus;
				providerResourceId = provisioned.providerResourceId;
				const updatePayload: Record<string, unknown> = {
					status: targetStatus,
					provider_resource_id: providerResourceId,
				};
				if (provisioned.connectionDetails) {
					updatePayload.connection_details = provisioned.connectionDetails;
				}
				await adminClient
					.from("service_resources")
					.update(updatePayload)
					.eq("id", job.resource_id);
			} else {
				if (!providerResourceId) throw new Error("Missing provider_resource_id for lifecycle action.");
				targetStatus = await executeLifecycleAction(String(resource.service_type), { action: job.action, providerResourceId });
				await adminClient
					.from("service_resources")
					.update({ status: targetStatus, provider_resource_id: providerResourceId })
					.eq("id", job.resource_id);
			}

			await adminClient.from("provision_jobs").update({ status: "succeeded", last_error: null, locked_at: null, locked_by: null }).eq("id", job.id);
			await adminClient.from("provision_events").insert({
				job_id: job.id,
				resource_id: job.resource_id,
				level: "info",
				event_type: `job.${job.action}.succeeded`,
				message: `Job action ${job.action} completed by worker.`,
				payload: { providerResourceId },
			});
		} catch (error) {
			failed += 1;
			const nextAttempt = (job.attempt_count ?? 0) + 1;
			const maxAttempts = job.max_attempts ?? 5;
			const isDeadLetter = nextAttempt >= maxAttempts;
			if (isDeadLetter) deadLettered += 1;

			await adminClient.from("provision_jobs").update({
				status: isDeadLetter ? "dead_letter" : "queued",
				attempt_count: nextAttempt,
				next_run_at: new Date(Date.now() + nextAttempt * 60_000).toISOString(),
				last_error: error instanceof Error ? error.message : "Unknown worker error",
				locked_at: null,
				locked_by: null,
			}).eq("id", job.id);

			await adminClient.from("provision_events").insert({
				job_id: job.id,
				resource_id: job.resource_id,
				level: "error",
				event_type: isDeadLetter ? "job.dead_letter" : "job.retry_scheduled",
				message: isDeadLetter ? "Job reached max attempts and was dead-lettered." : "Job failed and retry was scheduled.",
				payload: { attempt: nextAttempt, maxAttempts },
			});
		}
	}

	return jsonResponse({ ok: true, processed, failed, deadLettered }, 200, request);
});
