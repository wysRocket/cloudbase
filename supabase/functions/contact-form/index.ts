import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { MAIL_FROM, MAIL_TO, sendEmail } from "../_shared/mailer.ts";
import {
	getAuditMetadata,
	parseContactRequest,
	requireEnvVars,
} from "../_shared/security.ts";

requireEnvVars(["RESEND_API_KEY", "MAIL_FROM", "MAIL_TO"]);

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: getCorsHeaders(request) });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405, request);
	}

	try {
		const parsed = parseContactRequest(await request.json());
		const { firstName, lastName, email, phone, company, cloudSpend, message } =
			parsed;
		const audit = getAuditMetadata(request, email || null);

		await sendEmail({
			from: MAIL_FROM,
			to: MAIL_TO,
			subject: `Contact Form: ${firstName} ${lastName} — ${company || email}`,
			html: `
				<h2>New Contact Form Submission</h2>
				<p><strong>Actor:</strong> ${audit.actorId || "anonymous"}<br/><strong>Request ID:</strong> ${audit.requestId}<br/><strong>Correlation ID:</strong> ${audit.correlationId}</p>
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

		return jsonResponse({ ok: true }, 200, request);
	} catch (error) {
		return jsonResponse(
			{ error: error instanceof Error ? error.message : "Unknown error." },
			500,
			request,
		);
	}
});
