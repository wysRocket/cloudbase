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
			return jsonResponse({ error: "You must be signed in to pay." }, 401);
		}

		const body = await request.json();
		const currency = String(body?.currency || "").toUpperCase();
		const merchantId = requiredEnv("SAFEPAY_MERCHANT_ID");
		const merchantSecret = requiredEnv("SAFEPAY_MERCHANT_SECRET");

		const amountMinor = amountMajorToMinor(body?.amount, currency);
		const creditsToAdd = creditsFromMinorAmount(amountMinor, currency);

		const { data: existingProfile } = await adminClient
			.from("profiles")
			.select("id, email, first_name, last_name, phone, country_code, city")
			.eq("id", user.id)
			.maybeSingle();

		const normalizedCustomer = normalizeCustomerProfile({
			firstName: body?.customer?.firstName || existingProfile?.first_name,
			lastName: body?.customer?.lastName || existingProfile?.last_name,
			email: user.email || existingProfile?.email,
			phone: body?.customer?.phone || existingProfile?.phone,
			countryCode: body?.customer?.countryCode || existingProfile?.country_code,
			city: body?.customer?.city || existingProfile?.city,
		});
		const missingFields = getMissingCustomerFields(normalizedCustomer);

		if (missingFields.length > 0) {
			return jsonResponse(
				{
					error: `Missing required billing fields: ${missingFields.join(", ")}`,
					missingFields,
				},
				422,
			);
		}

		await adminClient.from("profiles").upsert(
			{
				id: user.id,
				...profileRowFromCustomerProfile(normalizedCustomer),
			},
			{ onConflict: "id" },
		);

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
			);
		}

		const { checkoutUrl, providerTransactionId } =
			parseCreatePaymentResponse(providerText);

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
				raw_create_response: providerText,
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
			);
		}

		return jsonResponse({
			paymentId: order.id,
			invoice,
			checkoutUrl,
		});
	} catch (error) {
		return jsonResponse(
			{ error: error instanceof Error ? error.message : "Unknown error." },
			500,
		);
	}
});
