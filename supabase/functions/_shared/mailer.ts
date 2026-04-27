import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

export const MAIL_FROM = "noreply@cloudbaseservice.com";
export const MAIL_TO = "contact@cloudbaseservice.com";

export interface EmailPayload {
	from: string;
	to: string;
	subject: string;
	html: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
	const host = Deno.env.get("SMTP_HOST");
	const user = Deno.env.get("SMTP_USER");
	const password = Deno.env.get("SMTP_PASSWORD");

	if (!host || !user || !password) {
		console.warn("SMTP credentials not configured — email skipped.");
		return;
	}

	const port = Number(Deno.env.get("SMTP_PORT") || "465");
	// Port 465 uses implicit TLS; port 587 uses STARTTLS.
	const tls = port === 465;

	const client = new SMTPClient({
		connection: {
			hostname: host,
			port,
			tls,
			auth: { username: user, password },
		},
	});

	try {
		await client.send({
			from: payload.from,
			to: payload.to,
			subject: payload.subject,
			html: payload.html,
		});
	} catch (err) {
		console.error("SMTP send error:", err);
		// Non-fatal — log and continue so callers are not interrupted.
	} finally {
		await client.close();
	}
}
