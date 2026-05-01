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
    if (userError || !user) return jsonResponse({ error: "You must be signed in." }, 401, request);

    const { orderId } = await request.json();
    const normalizedOrderId = String(orderId || "").trim();
    if (!normalizedOrderId) return jsonResponse({ error: "orderId is required." }, 400, request);

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, user_id, status")
      .eq("id", normalizedOrderId)
      .maybeSingle();

    if (orderError || !order || order.user_id !== user.id) return jsonResponse({ error: "Order not found." }, 404, request);
    if (order.status !== "paid") return jsonResponse({ error: "Order must be paid before provisioning." }, 409, request);

    const { data, error } = await adminClient.rpc("enqueue_provision_jobs_for_order", { p_order_id: order.id });
    if (error) return jsonResponse({ error: "Failed to enqueue provisioning jobs.", details: error.message }, 500, request);

    return jsonResponse({ ok: true, jobs: data ?? 0 }, 200, request);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, 500, request);
  }
});
