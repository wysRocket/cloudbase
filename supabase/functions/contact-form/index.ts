import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { MAIL_FROM, MAIL_TO, sendEmail } from "../_shared/mailer.ts";
import {
	enforceCatalogAllowlist,
	readJson,
	requestMeta,
	writeAuditTrail,
} from "../_shared/security.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: getCorsHeaders(request) });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405, request);
	}

	try {
		const body = readJson<Record<string, unknown>>(await request.json(), {});
		enforceCatalogAllowlist(body);
		const meta = requestMeta(request);
		const firstName = String(body?.firstName || "").trim();
		const lastName = String(body?.lastName || "").trim();
		const email = String(body?.email || "").trim();
		const phone = String(body?.phone || "").trim();
		const company = String(body?.company || "").trim();
		const cloudSpend = String(body?.cloudSpend || "").trim();
		const message = String(body?.message || "").trim();

		if (!email || !message) {
			return jsonResponse(
				{ error: "Email and message are required." },
				400,
				request,
			);
		}

		await sendEmail({
			from: MAIL_FROM,
			to: MAIL_TO,
			subject: `Contact Form: ${firstName} ${lastName} — ${company || email}`,
			html: `
				<h2>New Contact Form Submission</h2>
				<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
					<tr><td><strong>Name</strong></td><td>${firstName} ${lastName}</td></tr>
					<tr><td><strong>Email</strong></td><td><a href="mailto:${email}">${email}</a></td></tr>
					<tr><td><strong>Phone</strong></td><td>${phone || "—"}</td></tr>
					<tr><td><strong>Company</strong></td><td>${company || "—"}</td></tr>
					<tr><td><strong>Monthly Cloud Spend</strong></td><td>${cloudSpend || "—"}</td></tr>
				</table>
				<h3 style="margin-top:24px;">Message</h3>
				<p style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;">${message}</p>
			`,
		});

		await writeAuditTrail({
			action: "contact-form",
			actor: email || "anonymous",
			requestId: meta.requestId,
			ipHash: meta.ipHash,
			userAgentHash: meta.userAgentHash,
			payload: { email, company },
		});
		return jsonResponse({ ok: true }, 200, request);
	} catch (error) {
		return jsonResponse(
			{ error: error instanceof Error ? error.message : "Unknown error." },
			500,
			request,
		);
	}
});
