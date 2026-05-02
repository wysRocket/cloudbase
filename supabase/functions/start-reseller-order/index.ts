import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

type RequestBody = {
	planCode?: string;
	region?: string;
	quantity?: number;
	metadata?: Record<string, unknown>;
};

function normalizePlanCode(value: unknown) {
	return String(value || "").trim().toLowerCase();
}

function normalizeRegion(value: unknown) {
	return String(value || "").trim().toLowerCase();
}

function normalizeQuantity(value: unknown) {
	const parsed = Number(value);
	return Number.isInteger(parsed) ? parsed : NaN;
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
				{ error: "You must be signed in to start an order." },
				401,
				request,
			);
		}

		const body = (await request.json()) as RequestBody;
		const planCode = normalizePlanCode(body?.planCode);
		const region = normalizeRegion(body?.region);
		const quantity = normalizeQuantity(body?.quantity);

		if (!planCode || !region || !Number.isFinite(quantity) || quantity < 1) {
			return jsonResponse(
				{
					error:
						"Invalid payload. planCode, region, and quantity (>= 1 integer) are required.",
				},
				422,
				request,
			);
		}

		const { data: serviceCatalog, error: catalogError } = await adminClient
			.from("service_catalog")
			.select(
				"id, plan_code, region, unit_price_minor, currency, is_active, service_type, metadata",
			)
			.eq("plan_code", planCode)
			.eq("region", region)
			.eq("is_active", true)
			.maybeSingle();

		if (catalogError) {
			return jsonResponse(
				{ error: "Unable to validate catalog item.", details: catalogError.message },
				500,
				request,
			);
		}

		if (!serviceCatalog) {
			return jsonResponse(
				{ error: "Invalid planCode or region for active service catalog." },
				422,
				request,
			);
		}

		const unitPriceMinor = Number(serviceCatalog.unit_price_minor || 0);
		const totalPriceMinor = unitPriceMinor * quantity;

		const { data: order, error: orderError } = await adminClient
			.from("orders")
			.insert({
				user_id: user.id,
				status: "pending_payment",
				total_price_minor: totalPriceMinor,
				currency: serviceCatalog.currency,
				metadata: body?.metadata || {},
			})
			.select("id, status, total_price_minor, currency")
			.single();

		if (orderError || !order) {
			return jsonResponse(
				{ error: "Unable to create order.", details: orderError?.message },
				500,
				request,
			);
		}

		const { data: orderItem, error: itemError } = await adminClient
			.from("order_items")
			.insert({
				order_id: order.id,
				service_catalog_id: serviceCatalog.id,
				plan_code: serviceCatalog.plan_code,
				service_type: serviceCatalog.service_type,
				region: serviceCatalog.region,
				quantity,
				unit_price_minor: unitPriceMinor,
				total_price_minor: totalPriceMinor,
				currency: serviceCatalog.currency,
				config: (serviceCatalog.metadata || {}) as Record<string, unknown>,
			})
			.select("id")
			.single();

		if (itemError || !orderItem) {
			await adminClient.from("orders").delete().eq("id", order.id);

			return jsonResponse(
				{
					error: "Unable to create order items; rolled back order.",
					details: itemError?.message,
				},
				500,
				request,
			);
		}

		await adminClient.from("provision_events").insert([
			{
				order_id: order.id,
				event_type: "order.created",
				status: "queued",
				payload: {
					planCode,
					region,
					quantity,
				},
			},
			{
				order_id: order.id,
				event_type: "payment.session_requested",
				status: "queued",
				payload: {
					totalPriceMinor,
					currency: serviceCatalog.currency,
				},
			},
		]);

		const paymentIntentReference = `order_${order.id}`;

		return jsonResponse(
			{
				orderId: order.id,
				status: order.status,
				totalPriceMinor,
				currency: serviceCatalog.currency,
				paymentSession: {
					provider: "internal",
					paymentIntentReference,
				},
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
