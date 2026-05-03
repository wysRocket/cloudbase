import { jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { MAIL_FROM, sendEmail } from "../_shared/mailer.ts";
import { executeLifecycleAction, provisionResource } from "../_shared/providers/digitalocean-api.ts";

type ConnectionDetails = Record<string, unknown>;

function buildCredentialEmail(
	displayName: string,
	serviceType: string,
	region: string,
	details: ConnectionDetails,
): { subject: string; html: string } {
	const regionLabel = region.toUpperCase();

	let credentialsHtml = "";

	if (serviceType === "database") {
		credentialsHtml = `
      <table style="border-collapse:collapse;width:100%;font-family:monospace;font-size:14px;">
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">Host</td><td style="padding:6px 12px;">${details.host ?? "—"}</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">Port</td><td style="padding:6px 12px;">${details.port ?? "—"}</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">User</td><td style="padding:6px 12px;">${details.user ?? "—"}</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">Password</td><td style="padding:6px 12px;">${details.password ?? "—"}</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">SSL Mode</td><td style="padding:6px 12px;">${details.ssl ?? "require"}</td></tr>
      </table>`;
	} else if (serviceType === "kubernetes") {
		credentialsHtml = `
      <p>Your Kubernetes cluster is ready. Download your kubeconfig from the <strong>Dashboard → Resources</strong> page.</p>`;
	} else {
		// VPS, GPU, game_server — surface the IP(s)
		const ips: string[] = Array.isArray(details.ipv4) ? (details.ipv4 as string[]) : [];
		const ipList = ips.length > 0 ? ips.join(", ") : "Pending — check the dashboard in a moment";
		credentialsHtml = `
      <table style="border-collapse:collapse;width:100%;font-family:monospace;font-size:14px;">
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">IP Address</td><td style="padding:6px 12px;">${ipList}</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">Default User</td><td style="padding:6px 12px;">root</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">Auth</td><td style="padding:6px 12px;">SSH key registered on your account</td></tr>
      </table>`;
	}

	const subject = `Your ${displayName} server is ready — Cloudbase`;

	const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">
      <h2 style="color:#0e7490;">Your server is ready 🚀</h2>
      <p><strong>${displayName}</strong> (${serviceType.replace("_", " ")}, ${regionLabel}) has been provisioned and is now active.</p>
      <h3 style="margin-top:24px;">Connection Details</h3>
      ${credentialsHtml}
      <p style="margin-top:24px;font-size:13px;color:#666;">
        You can also find these details at any time in your
        <a href="https://cloudbaseservice.com/dashboard" style="color:#0e7490;">Cloudbase dashboard</a>.
        Keep your credentials secure and do not share them.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin-top:32px;"/>
      <p style="font-size:12px;color:#999;">Cloudbase · cloudbaseservice.com</p>
    </div>`;

	return { subject, html };
}

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
				.select("id, user_id, service_type, provider_resource_id, display_name, region, metadata")
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

				// Email the user their server credentials.
				if (provisioned.connectionDetails && resource.user_id) {
					const { data: userData } = await adminClient.auth.admin.getUserById(resource.user_id);
					const userEmail = userData?.user?.email;
					if (userEmail) {
						const { subject, html } = buildCredentialEmail(
							resource.display_name,
							resource.service_type,
							resource.region,
							provisioned.connectionDetails as ConnectionDetails,
						);
						await sendEmail({ from: MAIL_FROM, to: userEmail, subject, html });
					}
				}
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
