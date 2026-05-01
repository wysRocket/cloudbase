import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

const SKU_PRICING: Record<string, { amount_minor: number; currency: string; description: string }> = {
	vps: { amount_minor: 10000, currency: "USD", description: "VPS (Standard)" },
	k8s: { amount_minor: 100000, currency: "USD", description: "Kubernetes (Managed)" },
	db: { amount_minor: 30000, currency: "USD", description: "Database (PG/MySQL)" },
	gpu: { amount_minor: 5000, currency: "USD", description: "GPU (H100)" },
};

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

	try {
		const authHeader = request.headers.get("Authorization");
		const userClient = createUserClient(authHeader);
		const adminClient = createAdminClient();
		const { data: { user }, error: userError } = await userClient.auth.getUser();
		if (userError || !user) return jsonResponse({ error: "You must be signed in." }, 401, request);

		const body = await request.json();
		const sku = String(body?.sku || "").toLowerCase();
		const region = String(body?.region || "").trim();
		const pricing = SKU_PRICING[sku];
		if (!pricing || !region) return jsonResponse({ error: "Invalid sku or region." }, 422, request);

		const { data: order, error: orderError } = await adminClient.from("orders").insert({
			user_id: user.id,
			state: "pending_payment",
			amount_minor: pricing.amount_minor,
			currency: pricing.currency,
		}).select("id").single();
		if (orderError || !order) return jsonResponse({ error: "Unable to create order.", details: orderError?.message }, 500, request);

		const { data: orderItem, error: itemError } = await adminClient.from("order_items").insert({
			order_id: order.id,
			sku,
			region,
			description: pricing.description,
			amount_minor: pricing.amount_minor,
		}).select("id").single();
		if (itemError || !orderItem) return jsonResponse({ error: "Unable to create order item.", details: itemError?.message }, 500, request);

		const { data: payment, error: paymentError } = await adminClient.from("payment_orders").insert({
			user_id: user.id,
			invoice: `RSL-${order.id}`,
			amount_minor: pricing.amount_minor,
			currency: pricing.currency,
			credits_to_add: 0,
			status: "processing",
			description: `Reseller order for ${pricing.description} (${region})`,
			external_reference: order.id,
		}).select("id").single();
		if (paymentError || !payment) return jsonResponse({ error: "Unable to create payment session.", details: paymentError?.message }, 500, request);

		const { error: orderLinkError } = await adminClient.from("orders").update({ payment_order_id: payment.id }).eq("id", order.id);
		if (orderLinkError) return jsonResponse({ error: "Unable to link payment order.", details: orderLinkError.message }, 500, request);

		return jsonResponse({ orderId: order.id, orderItemId: orderItem.id, paymentOrderId: payment.id, checkoutUrl: `/dashboard/billing?paymentId=${payment.id}` }, 200, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, 500, request);
	}
});
