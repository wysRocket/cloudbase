import { formatMinorAmount } from "../../../shared/payments/catalog.js";
import { summarizeRefreshResult } from "../../../shared/payments/reconciliation.js";
import { buildRequestHash } from "../../../shared/payments/safepay-server.js";
import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { MAIL_FROM, MAIL_TO, sendEmail } from "../_shared/mailer.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

const gatewayUrl =
	Deno.env.get("SAFEPAY_GATEWAY_URL") ||
	"https://www.safepayto.me/new/gateway/";

function requiredEnv(name: string) {
	const value = Deno.env.get(name);

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

function toProviderStatusId(value: unknown) {
	const parsed = Number(value);
	return Number.isInteger(parsed) ? parsed : null;
}

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
			return jsonResponse(
				{ error: "You must be signed in to check payment status." },
				401,
				request,
			);
		}

		const body = await request.json();
		const invoice = String(body?.invoice || "").trim();

		if (!invoice) {
			return jsonResponse({ error: "Invoice is required." }, 400, request);
		}

		const { data: order, error: orderError } = await adminClient
			.from("payment_orders")
			.select(
				"id, user_id, invoice, amount_minor, currency, credits_to_add, status, provider_transaction_id, completed_at, external_reference",
			)
			.eq("invoice", invoice)
			.maybeSingle();

		if (orderError || !order || order.user_id !== user.id) {
			return jsonResponse({ error: "Payment not found." }, 404, request);
		}

		const merchantId = requiredEnv("SAFEPAY_MERCHANT_ID");
		const merchantSecret = requiredEnv("SAFEPAY_MERCHANT_SECRET");

		const payload = new URLSearchParams({
			_cmd: "request",
			merchant_id: merchantId,
			invoice,
			hash: buildRequestHash({
				invoice,
				merchantId,
				merchantSecret,
			}),
			output: "json",
		});

		const providerResponse = await fetch(gatewayUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: payload,
		});
		const providerText = await providerResponse.text();

		let providerJson: Record<string, unknown>;

		try {
			providerJson = JSON.parse(providerText);
		} catch {
			return jsonResponse(
				{
					error: "SafePay returned malformed status data.",
					details: providerText,
				},
				502,
				request,
			);
		}

		if (!providerResponse.ok || providerJson.error_code) {
			// SafePay returns error_code while a payment is still pending/processing
			// (not yet completed on their side). Treat this as "still processing"
			// rather than a hard failure so the frontend can keep polling gracefully.
			await adminClient
				.from("payment_orders")
				.update({
					last_checked_at: new Date().toISOString(),
					raw_status_response: providerJson,
					provider_status_text: String(
						providerJson.error || providerJson.error_code || "pending",
					),
				})
				.eq("id", order.id);

			return jsonResponse(
				{
					invoice,
					status: order.status ?? "processing",
					providerStatusId: null,
					providerStatusText: String(
						providerJson.error || providerJson.error_code || "pending",
					),
					creditsApplied: false,
					balanceDelta: 0,
				},
				200,
				request,
			);
		}

		const { data: existingCredit, error: existingCreditError } =
			await adminClient
				.from("credit_transactions")
				.select("id")
				.eq("payment_order_id", order.id)
				.limit(1)
				.maybeSingle();

		if (existingCreditError) {
			return jsonResponse(
				{
					error: "Unable to load the payment credit state.",
					details: existingCreditError.message,
				},
				500,
				request,
			);
		}

		const refreshSummary = summarizeRefreshResult({
			currentOrder: order,
			providerPayload: providerJson,
			hasAppliedCredit: Boolean(existingCredit),
		});

		const nowIso = new Date().toISOString();
		const providerStatusId = toProviderStatusId(providerJson.status_id);
		const providerStatusText = String(providerJson.payment_system_status || "");
		const { error: updateError } = await adminClient
			.from("payment_orders")
			.update({
				status: refreshSummary.status,
				provider_status_id: providerStatusId,
				provider_status_text: providerStatusText,
				provider_transaction_id:
					refreshSummary.providerTransactionId || order.provider_transaction_id,
				raw_status_response: providerJson,
				last_checked_at: nowIso,
				completed_at:
					refreshSummary.status === "completed"
						? order.completed_at || nowIso
						: order.completed_at,
			})
			.eq("id", order.id);

		if (updateError) {
			return jsonResponse(
				{
					error: "Unable to update payment order status.",
					details: updateError.message,
				},
				500,
				request,
			);
		}

		if (refreshSummary.status === "completed" && order.external_reference) {
			await adminClient
				.from("orders")
				.update({ state: "paid" })
				.eq("id", order.external_reference)
				.in("state", ["pending_payment", "payment_processing"]);

			await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/provider-provision`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
				},
				body: JSON.stringify({ orderId: order.external_reference }),
			});
		}

		let creditsApplied = Boolean(existingCredit);
		let balanceDelta = 0;

		if (refreshSummary.shouldApplyCredits) {
			const { error: insertError } = await adminClient
				.from("credit_transactions")
				.insert({
					user_id: user.id,
					payment_order_id: order.id,
					description: "Credits Purchase",
					amount: order.credits_to_add,
					type: "credit",
					status: "Completed",
					currency_paid: formatMinorAmount(order.amount_minor, order.currency),
					currency: order.currency,
				});

			if (insertError && insertError.code !== "23505") {
				return jsonResponse(
					{
						error: "Payment succeeded but credits could not be applied yet.",
						details: insertError.message,
					},
					500,
					request,
				);
			}

			creditsApplied = true;
			balanceDelta =
				insertError?.code === "23505" ? 0 : refreshSummary.balanceDelta;

			// Send admin notification only on a fresh (non-duplicate) credit grant.
			if (!insertError) {
				await sendEmail({
					from: MAIL_FROM,
					to: MAIL_TO,
					subject: `Payment Received — ${formatMinorAmount(order.amount_minor, order.currency)} (${order.credits_to_add} credits)`,
					html: `
						<h2>New Credit Purchase</h2>
						<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
							<tr><td><strong>User</strong></td><td>${user.email}</td></tr>
							<tr><td><strong>Invoice</strong></td><td>${order.invoice}</td></tr>
							<tr><td><strong>Amount Paid</strong></td><td>${formatMinorAmount(order.amount_minor, order.currency)}</td></tr>
							<tr><td><strong>Credits Added</strong></td><td>${order.credits_to_add}</td></tr>
						</table>
					`,
				});
			}
		}

		return jsonResponse(
			{
				invoice,
				status: refreshSummary.status,
				providerStatusId: providerStatusId,
				providerStatusText: providerStatusText,
				creditsApplied,
				balanceDelta,
			},
			200,
			request,
		);
	} catch (error) {
		return jsonResponse(
			{ error: error instanceof Error ? error.message : "Unknown error." },
			500,
			request,
		);
	}
});
