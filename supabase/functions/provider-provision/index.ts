import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";
import { assertCatalogAllowlist, assertQuota, fingerprintRequest, rejectRestrictedClientFields, validateBasePayload } from "../_shared/provider-guard.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

  const authHeader = request.headers.get("Authorization");
  const userClient = createUserClient(authHeader);
  const adminClient = createAdminClient();
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return jsonResponse({ error: "Unauthorized." }, 401, request);

  try {
    const body = await request.json();
    rejectRestrictedClientFields(body, ["provider_sku", "unit_price", "provider", "billing_cycle", "overage_policy"]);
    const payload = validateBasePayload(body);
    await assertCatalogAllowlist(payload);
    await assertQuota(user.id, "services", 24 * 365, 20);
    await assertQuota(user.id, "provision_jobs", 1, 30);

    const actorFingerprint = fingerprintRequest(request, user.id);
    const { error: eventError } = await adminClient.from("provision_events").insert({
      user_id: user.id,
      actor_id: user.id,
      actor_type: "user",
      request_fingerprint: actorFingerprint,
      action: "provision",
      metadata: { planCode: payload.planCode, region: payload.region, service_type: payload.service_type, idempotencyKey: payload.idempotencyKey },
    });
    if (eventError) return jsonResponse({ error: eventError.message }, 500, request);

    return jsonResponse({ ok: true, accepted: true }, 202, request);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Invalid request." }, 422, request);
  }
});
