import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

  try {
    const authHeader = request.headers.get("Authorization");
    const userClient = createUserClient(authHeader);
    const adminClient = createAdminClient();
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "You must be signed in to deploy." }, 401, request);

    const body = await request.json();
    const sku = String(body?.sku || "").trim();
    const region = String(body?.region || "").trim();
    if (!sku || !region) return jsonResponse({ error: "sku and region are required." }, 400, request);

    const { data: catalog, error: catalogError } = await adminClient
      .from("reseller_skus")
      .select("sku, price_minor, currency")
      .eq("sku", sku)
      .eq("is_active", true)
      .maybeSingle();
    if (catalogError) return jsonResponse({ error: "Failed to load SKU.", details: catalogError.message }, 500, request);
    if (!catalog) return jsonResponse({ error: "Unknown SKU." }, 404, request);

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({ user_id: user.id, status: "pending", total_minor: catalog.price_minor, currency: catalog.currency })
      .select("id, total_minor, currency")
      .single();
    if (orderError || !order) return jsonResponse({ error: "Failed to create order.", details: orderError?.message }, 500, request);

    const { data: orderItem, error: itemError } = await adminClient
      .from("order_items")
      .insert({ order_id: order.id, sku: catalog.sku, region, unit_price_minor: catalog.price_minor, quantity: 1 })
      .select("id")
      .single();
    if (itemError || !orderItem) return jsonResponse({ error: "Failed to create order item.", details: itemError?.message }, 500, request);

    const paymentSession = {
      provider: "mock",
      checkout_url: `${new URL(request.url).origin}/dashboard/billing?order=${order.id}`,
      amount_minor: order.total_minor,
      currency: order.currency,
    };

    const { error: sessionError } = await adminClient
      .from("orders")
      .update({ payment_session: paymentSession })
      .eq("id", order.id);
    if (sessionError) return jsonResponse({ error: "Failed to persist payment session.", details: sessionError.message }, 500, request);

    return jsonResponse({ orderId: order.id, orderItemId: orderItem.id, paymentSession }, 200, request);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, 500, request);
  }
});
