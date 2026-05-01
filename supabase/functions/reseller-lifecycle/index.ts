import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";
import { assertLifecycleRequest, correlationFromRequest, enforceQuota, parseJsonBody, validateResellerEnv, writeAudit } from "../_shared/reseller-security.ts";

validateResellerEnv();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

  try {
    const userClient = createUserClient(request.headers.get("Authorization"));
    const adminClient = createAdminClient();
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return jsonResponse({ error: "Unauthorized." }, 401, request);

    const parsed = assertLifecycleRequest(await parseJsonBody(request));
    await enforceQuota(adminClient, user.id, `lifecycle:${parsed.action}`);

    const { requestId, correlationId } = correlationFromRequest(request);
    const { error: updateError } = await adminClient
      .from("reseller_orders")
      .update({ desired_state: parsed.action, request_id: requestId, correlation_id: correlationId })
      .eq("id", parsed.resourceId)
      .eq("user_id", user.id);

    if (updateError) throw new Error(updateError.message);

    await writeAudit(adminClient, { actor: user.id, operation: `lifecycle:${parsed.action}`, resourceId: parsed.resourceId, requestId, correlationId, payload: parsed as unknown as Record<string, unknown> });
    return jsonResponse({ resourceId: parsed.resourceId, action: parsed.action, requestId, correlationId }, 202, request);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Lifecycle update failed." }, 422, request);
  }
});
