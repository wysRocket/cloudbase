import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

  const adminClient = createAdminClient();

  try {
    const body = await request.json();
    const orderItemId = String(body?.orderItemId || "");
    const provider = String(body?.provider || "");
    const payload = body?.payload || {};

    if (!orderItemId) return jsonResponse({ error: "orderItemId is required." }, 422, request);
    if (!provider) return jsonResponse({ error: "provider is required." }, 422, request);

    const { data: orderItem, error: orderItemError } = await adminClient
      .from("order_items")
      .select("id, order_id, orders!inner(id, status)")
      .eq("id", orderItemId)
      .single();

    if (orderItemError || !orderItem) {
      return jsonResponse({ error: "Order item not found.", details: orderItemError?.message }, 404, request);
    }

    const orderStatus = (orderItem as any).orders?.status;
    if (orderStatus !== "paid") {
      return jsonResponse({ error: "Provisioning requires a paid order." }, 409, request);
    }

    const { data, error } = await adminClient
      .from("provider_provision_queue")
      .insert({ order_item_id: orderItemId, provider, payload, status: "queued" })
      .select("id")
      .single();

    if (error || !data) {
      return jsonResponse({ error: "Failed to enqueue provisioning.", details: error?.message }, 500, request);
    }

    return jsonResponse({ queueId: data.id, status: "queued" }, 200, request);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, 500, request);
  }
});
