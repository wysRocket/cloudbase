import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
	if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

	try {
		const adminClient = createAdminClient();
		const body = await request.json();
		const orderId = String(body?.orderId || "");
		if (!orderId) return jsonResponse({ error: "orderId is required." }, 422, request);

		const { data: order, error: orderError } = await adminClient
			.from("orders")
			.select("id, user_id, state, payment_order_id, order_items(id, sku, region)")
			.eq("id", orderId)
			.single();
		if (orderError || !order) return jsonResponse({ error: "Order not found." }, 404, request);
		if (order.state !== "paid") return jsonResponse({ error: "Order is not paid." }, 409, request);

		const item = order.order_items?.[0];
		if (!item) return jsonResponse({ error: "Order has no items." }, 409, request);

		const { data: resource, error: resourceError } = await adminClient.from("service_resources").insert({
			user_id: order.user_id,
			order_item_id: item.id,
			sku: item.sku,
			region: item.region,
			status: "queued",
		}).select("id").single();
		if (resourceError || !resource) return jsonResponse({ error: "Unable to create service resource.", details: resourceError?.message }, 500, request);

		const { error: jobError } = await adminClient.from("provision_jobs").insert({
			order_id: order.id,
			order_item_id: item.id,
			service_resource_id: resource.id,
			status: "queued",
		});
		if (jobError) return jsonResponse({ error: "Unable to enqueue provision job.", details: jobError.message }, 500, request);

		await adminClient.from("orders").update({ state: "provisioning" }).eq("id", order.id);
		return jsonResponse({ ok: true, serviceResourceId: resource.id }, 200, request);
	} catch (error) {
		return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, 500, request);
	}
});
