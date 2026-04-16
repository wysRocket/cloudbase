import { formatMinorAmount } from "../../../shared/payments/catalog.js";
import { summarizeRefreshResult } from "../../../shared/payments/reconciliation.js";
import { buildRequestHash } from "../../../shared/payments/safepay-server.js";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
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

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405);
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
			);
		}

		const body = await request.json();
		const invoice = String(body?.invoice || "").trim();

		if (!invoice) {
			return jsonResponse({ error: "Invoice is required." }, 400);
		}

		const { data: order, error: orderError } = await adminClient
			.from("payment_orders")
			.select(
				"id, user_id, invoice, amount_minor, currency, credits_to_add, status, provider_transaction_id, completed_at",
			)
			.eq("invoice", invoice)
			.maybeSingle();

		if (orderError || !order || order.user_id !== user.id) {
			return jsonResponse({ error: "Payment not found." }, 404);
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
			);
		}

		if (!providerResponse.ok || providerJson.error_code) {
			await adminClient
				.from("payment_orders")
				.update({
					last_checked_at: new Date().toISOString(),
					raw_status_response: providerJson,
					provider_status_text: String(
						providerJson.error || providerJson.error_code || "error",
					),
				})
				.eq("id", order.id);

			return jsonResponse(
				{
					error: "SafePay status lookup failed.",
					details:
						providerJson.error || providerJson.error_code || providerText,
				},
				502,
			);
		}

		const { data: existingCredit } = await adminClient
			.from("credit_transactions")
			.select("id")
			.eq("payment_order_id", order.id)
			.limit(1)
			.maybeSingle();

		const refreshSummary = summarizeRefreshResult({
			currentOrder: order,
			providerPayload: providerJson,
			hasAppliedCredit: Boolean(existingCredit),
		});

		const nowIso = new Date().toISOString();
		await adminClient
			.from("payment_orders")
			.update({
				status: refreshSummary.status,
				provider_status_id: providerJson.status_id ?? null,
				provider_status_text: String(providerJson.payment_system_status || ""),
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
				);
			}

			creditsApplied = true;
			balanceDelta =
				insertError?.code === "23505" ? 0 : refreshSummary.balanceDelta;
		}

		return jsonResponse({
			invoice,
			status: refreshSummary.status,
			providerStatusId: providerJson.status_id ?? null,
			providerStatusText: String(providerJson.payment_system_status || ""),
			creditsApplied,
			balanceDelta,
		});
	} catch (error) {
		return jsonResponse(
			{ error: error instanceof Error ? error.message : "Unknown error." },
			500,
		);
	}
});
