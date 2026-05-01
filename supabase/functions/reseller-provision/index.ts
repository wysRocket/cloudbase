import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";
import { assertAllowlisted, assertProvisionRequest, correlationFromRequest, enforceQuota, parseJsonBody, validateResellerEnv, writeAudit } from "../_shared/reseller-security.ts";

validateResellerEnv();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

  try {
    const userClient = createUserClient(request.headers.get("Authorization"));
    const adminClient = createAdminClient();
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return jsonResponse({ error: "Unauthorized." }, 401, request);

    const parsed = assertProvisionRequest(await parseJsonBody(request));
    assertAllowlisted(parsed);
    await enforceQuota(adminClient, user.id, "provision");

    const { requestId, correlationId } = correlationFromRequest(request);
    const { data: row, error: insertError } = await adminClient.from("reseller_orders").insert({
      user_id: user.id,
      plan: parsed.plan,
      region: parsed.region,
      service_type: parsed.serviceType,
      status: "queued",
      metadata: parsed.config ?? {},
      request_id: requestId,
      correlation_id: correlationId,
    }).select("id,status").single();

    if (insertError) throw new Error(insertError.message);

    await writeAudit(adminClient, { actor: user.id, operation: "provision", resourceId: row.id, requestId, correlationId, payload: parsed });
    return jsonResponse({ id: row.id, status: row.status, requestId, correlationId }, 202, request);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Provisioning failed." }, 422, request);
  }
});
