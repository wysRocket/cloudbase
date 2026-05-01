import {
	amountMajorToMinor,
	creditsFromMinorAmount,
} from "../../../shared/payments/catalog.js";
import {
	getMissingCustomerFields,
	normalizeCustomerProfile,
	profileRowFromCustomerProfile,
} from "../../../shared/payments/customer.js";
import {
	buildInvoice,
	buildPaymentHash,
	parseCreatePaymentResponse,
} from "../../../shared/payments/safepay-server.js";
import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
	checkRateLimit,
	enforceAllowlist,
	getAuditMetadata,
	getEnvOrThrow,
	parseCreatePaymentRequest,
	requireEnvVars,
} from "../_shared/security.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

const gatewayUrl =
	Deno.env.get("SAFEPAY_GATEWAY_URL") ||
	"https://www.safepayto.me/new/gateway/";

const PLAN_ALLOWLIST = ["topup", "starter", "pro", "business"] as const;
const REGION_ALLOWLIST = [
	"global",
	"us-east",
	"eu-central",
	"ap-southeast",
] as const;
const SERVICE_TYPE_ALLOWLIST = [
	"credits",
	"vps",
	"k8s",
	"database",
	"gpu",
] as const;

requireEnvVars([
	"SUPABASE_URL",
	"SUPABASE_ANON_KEY",
	"SUPABASE_SERVICE_ROLE_KEY",
	"SAFEPAY_MERCHANT_ID",
	"SAFEPAY_MERCHANT_SECRET",
]);

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
				{ error: "You must be signed in to pay." },
				401,
				request,
			);
		}

		const parsedBody = parseCreatePaymentRequest(await request.json());
		const { currency, amount, customer, plan, region, serviceType } =
			parsedBody;
		enforceAllowlist(plan, PLAN_ALLOWLIST, "plan");
		enforceAllowlist(region, REGION_ALLOWLIST, "region");
		enforceAllowlist(serviceType, SERVICE_TYPE_ALLOWLIST, "service type");
		const merchantId = getEnvOrThrow("SAFEPAY_MERCHANT_ID");
		const merchantSecret = getEnvOrThrow("SAFEPAY_MERCHANT_SECRET");

		let amountMinor: number;
		let creditsToAdd: number;

		try {
			amountMinor = amountMajorToMinor(amount, currency);
			creditsToAdd = creditsFromMinorAmount(amountMinor, currency);
		} catch (error) {
			return jsonResponse(
				{
					error:
						error instanceof Error
							? error.message
							: "Invalid amount or currency.",
				},
				422,
				request,
			);
		}

		const { data: existingProfile, error: existingProfileError } =
			await adminClient
				.from("profiles")
				.select("id, email, first_name, last_name, phone, country_code, city")
				.eq("id", user.id)
				.maybeSingle();

		if (existingProfileError) {
			return jsonResponse(
				{
					error: "Unable to load the billing profile.",
					details: existingProfileError.message,
				},
				500,
				request,
			);
		}

		const normalizedCustomer = normalizeCustomerProfile({
			firstName: customer.firstName || existingProfile?.first_name,
			lastName: customer.lastName || existingProfile?.last_name,
			email: user.email || existingProfile?.email,
			phone: customer.phone || existingProfile?.phone,
			countryCode: customer.countryCode || existingProfile?.country_code,
			city: customer.city || existingProfile?.city,
		});
		const missingFields = getMissingCustomerFields(normalizedCustomer);

		if (missingFields.length > 0) {
			return jsonResponse(
				{
					error: `Missing required billing fields: ${missingFields.join(", ")}`,
					missingFields,
				},
				422,
				request,
			);
		}

		const { error: profileError } = await adminClient.from("profiles").upsert(
			{
				id: user.id,
				...profileRowFromCustomerProfile(normalizedCustomer),
			},
			{ onConflict: "id" },
		);

		if (profileError) {
			return jsonResponse(
				{
					error: "Unable to update billing profile.",
					details: profileError.message,
				},
				500,
				request,
			);
		}

		const invoice = buildInvoice({ prefix: "WCT", userId: user.id });
		const description = `CloudbaseTop credit top-up (${creditsToAdd} credits)`;

		const payload = new URLSearchParams({
			_cmd: "payment",
			merchant_id: merchantId,
			amount: String(amountMinor),
			currency,
			invoice,
			language: "ENG",
			cl_fname: normalizedCustomer.firstName,
			cl_lname: normalizedCustomer.lastName,
			cl_email: normalizedCustomer.email,
			cl_phone: normalizedCustomer.phone,
			cl_country: normalizedCustomer.countryCode,
			cl_city: normalizedCustomer.city,
			description,
			psys: "",
			get_trans: "1",
			hash: buildPaymentHash({
				amountMinor,
				currency,
				merchantId,
				merchantSecret,
			}),
		});

		const providerResponse = await fetch(gatewayUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: payload,
		});
		const providerText = await providerResponse.text();

		if (!providerResponse.ok) {
			return jsonResponse(
				{
					error: "SafePay rejected the payment session request.",
					details: providerText,
				},
				502,
				request,
			);
		}

		let checkoutUrl: string;
		let providerTransactionId: string;

		try {
			({ checkoutUrl, providerTransactionId } = parseCreatePaymentResponse(
				providerText,
				{
					allowedHosts: [
						new URL(gatewayUrl).hostname,
						"www.safepayto.me",
						"safepayto.me",
					],
				},
			));
		} catch (error) {
			return jsonResponse(
				{
					error: "SafePay returned an invalid payment session.",
					details:
						error instanceof Error
							? error.message
							: "Invalid checkout response.",
				},
				502,
				request,
			);
		}

		const rate = checkRateLimit(user.id, "create-payment-session", 10, 60_000);
		if (!rate.allowed) {
			return jsonResponse(
				{ error: "Rate limit exceeded. Try again later." },
				429,
				request,
			);
		}

		const audit = getAuditMetadata(request, user.id);

		const { data: order, error: orderError } = await adminClient
			.from("payment_orders")
			.insert({
				user_id: user.id,
				invoice,
				provider_transaction_id: providerTransactionId,
				amount_minor: amountMinor,
				currency,
				credits_to_add: creditsToAdd,
				status: "processing",
				description,
				customer_first_name: normalizedCustomer.firstName,
				customer_last_name: normalizedCustomer.lastName,
				customer_email: normalizedCustomer.email,
				customer_phone: normalizedCustomer.phone,
				customer_country_code: normalizedCustomer.countryCode,
				customer_city: normalizedCustomer.city,
				raw_create_response: JSON.stringify({
					providerText,
					audit,
					catalog: { plan, region, serviceType },
				}),
			})
			.select("id")
			.single();

		if (orderError || !order) {
			return jsonResponse(
				{
					error: "Unable to save the payment session.",
					details: orderError?.message,
				},
				500,
				request,
			);
		}

		return jsonResponse(
			{
				paymentId: order.id,
				invoice,
				checkoutUrl,
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
