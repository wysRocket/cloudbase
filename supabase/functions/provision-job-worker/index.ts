import { jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { executeLifecycleAction, provisionResource, syncResourceStatus } from "../_shared/providers/digitalocean-api.ts";
import { MAIL_FROM, sendEmailOrThrow } from "../_shared/mailer.ts";

type ConnectionDetails = Record<string, unknown>;

/** Escapes characters that have special meaning in HTML to prevent injection. */
function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#x27;");
}

function buildCredentialEmail(
	displayName: string,
	serviceType: string,
	region: string,
	details: ConnectionDetails,
): { subject: string; html: string } {
	const regionLabel = escapeHtml(region.toUpperCase());
	const safeDisplayName = escapeHtml(displayName);
	const safeServiceType = escapeHtml(serviceType.replace("_", " "));

	let credentialsHtml = "";

	if (serviceType === "database") {
		// Passwords are not included in email — user retrieves them from the secure dashboard.
		credentialsHtml = `
      <table style="border-collapse:collapse;width:100%;font-family:monospace;font-size:14px;">
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">Host</td><td style="padding:6px 12px;">${escapeHtml(details.host ?? "—")}</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">Port</td><td style="padding:6px 12px;">${escapeHtml(details.port ?? "—")}</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">User</td><td style="padding:6px 12px;">${escapeHtml(details.user ?? "—")}</td></tr>
        <tr><td style="padding:6px 12px;background:#f4f4f4;font-weight:bold;">SSL Mode</td><td style="padding:6px 12px;">${escapeHtml(details.ssl ?? "require")}</td></tr>
      </table>
      <p style="margin-top:12px;font-size:13px;color:#666;">
        Your database password is available securely in the
        <a href="https://cloudbaseservice.com/dashboard" style="color:#0e7490;">Cloudbase dashboard</a>.
      </p>`;
	} else if (serviceType === "kubernetes") {
		credentialsHtml = `
      <p>Your Kubernetes cluster is ready. Download your kubeconfig from the <strong>Dashboard → Resources</strong> page.</p>`;
	} else {
		// VPS, GPU, game_server — surface the IP. The provider returns ipv4 as a string or array.
		const rawIpv4 = details.ipv4;
		let ips: string[];
		if (Array.isArray(rawIpv4)) {
			ips = rawIpv4 as string[];
		} else if (typeof rawIpv4 === "string" && rawIpv4) {
			ips = [rawIpv4];
		} else {
			ips = [];
		}
		const ipList = ips.length > 0 ? ips.map(escapeHtml).join(", ") : "Pending — check the dashboard in a moment";
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
      <p><strong>${safeDisplayName}</strong> (${safeServiceType}, ${regionLabel}) has been provisioned and is now active.</p>
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

	// Sync-only mode: update status of all resources stuck in "provisioning"
	// Only sync resources older than 90 seconds (give DO time to create the droplet)
	const url = new URL(request.url);
	if (url.searchParams.get("action") === "sync_provisioning") {
		const cutoff = new Date(Date.now() - 90_000).toISOString();
		const { data: stuckResources, error: queryError } = await adminClient
			.from("service_resources")
			.select("id, service_type, provider_resource_id")
			.eq("status", "provisioning")
			.neq("provider_resource_id", null)
			.lt("updated_at", cutoff);

		if (queryError) return jsonResponse({ error: queryError.message, phase: "query" }, 500, request);

		let synced = 0;
		const errors: string[] = [];
		for (const res of stuckResources || []) {
			try {
				const result = await syncResourceStatus(String(res.service_type), {
					providerResourceId: String(res.provider_resource_id),
					serviceType: String(res.service_type),
				});
				const updatePayload: Record<string, unknown> = { status: result.status };
				if (result.connectionDetails) updatePayload.connection_details = result.connectionDetails;
				await adminClient.from("service_resources").update(updatePayload).eq("id", res.id);
				synced += 1;
			} catch (err) {
				// 404 = DO not done yet, skip silently. Other errors are real failures.
				const msg = err instanceof Error ? err.message : "unknown error";
				if (!msg.includes("404")) errors.push(msg);
			}
		}
		return jsonResponse({ ok: true, synced, found: (stuckResources || []).length, errors }, 200, request);
	}

	// Diagnostic: test SMTP delivery — surfaces real errors instead of swallowing them
	if (url.searchParams.get("action") === "test_email") {
		const to = url.searchParams.get("to");
		if (!to) return jsonResponse({ error: "?to=email@example.com required" }, 400, request);
		try {
			await sendEmailOrThrow({
				from: MAIL_FROM,
				to,
				subject: "CloudBase SMTP test",
				html: "<p>SMTP is working correctly. This is a test email from CloudBase.</p>",
			});
			return jsonResponse({ ok: true, message: `Test email sent to ${to}` }, 200, request);
		} catch (err) {
			return jsonResponse({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500, request);
		}
	}

	// Diagnostic: list actual DO droplets to debug ID mismatches
	if (url.searchParams.get("action") === "list_do_droplets") {
		const token = Deno.env.get("DIGITALOCEAN_API_TOKEN");
		if (!token) return jsonResponse({ error: "Missing DIGITALOCEAN_API_TOKEN" }, 500, request);
		const res = await fetch("https://api.digitalocean.com/v2/droplets?per_page=50", {
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		});
		const data = await res.json();
		const simplified = (data.droplets || []).map((d: Record<string, unknown>) => ({
			id: d.id,
			name: d.name,
			status: d.status,
			ip: ((d.networks as Record<string, unknown[]>)?.v4 || []).find((n: Record<string, unknown>) => n.type === "public")?.ip_address,
		}));
		return jsonResponse({ ok: true, droplets: simplified, total: simplified.length }, 200, request);
	}

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
				.select("id, service_type, provider_resource_id, display_name, region, metadata, user_id")
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

				// Email the user their server credentials after any successful provision.
				if (resource.user_id) {
					const { data: userData } = await adminClient.auth.admin.getUserById(resource.user_id);
					const userEmail = userData?.user?.email;
					if (userEmail) {
						const { subject, html } = buildCredentialEmail(
							resource.display_name,
							resource.service_type,
							resource.region,
							(provisioned.connectionDetails ?? {}) as ConnectionDetails,
						);
						await sendEmailOrThrow({ from: MAIL_FROM, to: userEmail, subject, html }).catch((err) => {
							console.error("Provision email failed:", err instanceof Error ? err.message : err);
						});
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
			const errMsg = error instanceof Error ? error.message : "Unknown worker error";

			// If the provider returns 404 on a lifecycle action, the resource is gone — mark deleted immediately.
			if (errMsg.includes("404") && job.action !== "provision") {
				await adminClient.from("service_resources").update({ status: "deleted" }).eq("id", job.resource_id);
				await adminClient.from("provision_jobs").update({
					status: "dead_letter",
					attempt_count: (job.attempt_count ?? 0) + 1,
					last_error: "Resource no longer exists on provider (404). Marked deleted.",
					locked_at: null,
					locked_by: null,
				}).eq("id", job.id);
				await adminClient.from("provision_events").insert({
					job_id: job.id,
					resource_id: job.resource_id,
					level: "warn",
					event_type: "job.resource_not_found",
					message: "Provider returned 404 — resource no longer exists. Marked deleted.",
					payload: { action: job.action },
				});
				deadLettered += 1;
				continue;
			}

			const nextAttempt = (job.attempt_count ?? 0) + 1;
			const maxAttempts = job.max_attempts ?? 5;
			const isDeadLetter = nextAttempt >= maxAttempts;
			if (isDeadLetter) deadLettered += 1;

			await adminClient.from("provision_jobs").update({
				status: isDeadLetter ? "dead_letter" : "queued",
				attempt_count: nextAttempt,
				next_run_at: new Date(Date.now() + nextAttempt * 60_000).toISOString(),
				last_error: errMsg,
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
