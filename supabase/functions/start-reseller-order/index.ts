import { buildInvoice, buildPaymentHash, parseCreatePaymentResponse } from "../../../shared/payments/safepay-server.js";
import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

const gatewayUrl = Deno.env.get("SAFEPAY_GATEWAY_URL") || "https://www.safepayto.me/new/gateway/";
const ALLOWED_PLANS = new Set(["starter", "growth", "scale"]);
const ALLOWED_REGIONS = new Set(["us-east", "us-west", "eu-central", "ap-south"]);

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

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
    const plan = String(body?.plan || "").toLowerCase();
    const region = String(body?.region || "").toLowerCase();
    const amountMinor = Number(body?.amountMinor);
    const currency = String(body?.currency || "USD").toUpperCase();

    if (!ALLOWED_PLANS.has(plan)) return jsonResponse({ error: "Unsupported plan." }, 422, request);
    if (!ALLOWED_REGIONS.has(region)) return jsonResponse({ error: "Unsupported region." }, 422, request);
    if (!Number.isInteger(amountMinor) || amountMinor <= 0) return jsonResponse({ error: "Invalid amountMinor." }, 422, request);

    const merchantId = requiredEnv("SAFEPAY_MERCHANT_ID");
    const merchantSecret = requiredEnv("SAFEPAY_MERCHANT_SECRET");
    const invoice = buildInvoice({ prefix: "RSL", userId: user.id });
    const description = `Reseller order (${plan} in ${region})`;

    const payload = new URLSearchParams({
      _cmd: "payment",
      merchant_id: merchantId,
      amount: String(amountMinor),
      currency,
      invoice,
      language: "ENG",
      cl_fname: String(body?.customer?.firstName || "Reseller"),
      cl_lname: String(body?.customer?.lastName || "Customer"),
      cl_email: String(body?.customer?.email || user.email || ""),
      cl_phone: String(body?.customer?.phone || "000000000"),
      cl_country: String(body?.customer?.countryCode || "US"),
      cl_city: String(body?.customer?.city || "Unknown"),
      description,
      psys: "",
      get_trans: "1",
      hash: buildPaymentHash({ amountMinor, currency, merchantId, merchantSecret }),
    });

    const providerResponse = await fetch(gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
    });
    const providerText = await providerResponse.text();
    if (!providerResponse.ok) return jsonResponse({ error: "Failed to create payment session.", details: providerText }, 502, request);

    const { checkoutUrl, providerTransactionId } = parseCreatePaymentResponse(providerText, {
      allowedHosts: [new URL(gatewayUrl).hostname, "www.safepayto.me", "safepayto.me"],
    });

    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user.id,
        invoice,
        amount_minor: amountMinor,
        currency,
        status: "pending_payment",
        provider_transaction_id: providerTransactionId,
      })
      .select("id")
      .single();

    if (orderError || !order) return jsonResponse({ error: "Could not create order.", details: orderError?.message }, 500, request);

    const { data: orderItem, error: itemError } = await adminClient
      .from("order_items")
      .insert({
        order_id: order.id,
        plan_code: plan,
        region_code: region,
        quantity: 1,
        unit_amount_minor: amountMinor,
      })
      .select("id")
      .single();

    if (itemError || !orderItem) return jsonResponse({ error: "Could not create order item.", details: itemError?.message }, 500, request);

    return jsonResponse({ orderId: order.id, orderItemId: orderItem.id, checkoutUrl, invoice }, 200, request);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error." }, 500, request);
  }
});
