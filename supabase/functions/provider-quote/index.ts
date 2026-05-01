import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createUserClient } from "../_shared/supabase.ts";
import { assertCatalogAllowlist, rejectRestrictedClientFields, validateBasePayload } from "../_shared/provider-guard.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, request);

  const authHeader = request.headers.get("Authorization");
  const userClient = createUserClient(authHeader);
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return jsonResponse({ error: "Unauthorized." }, 401, request);

  try {
    const body = await request.json();
    rejectRestrictedClientFields(body, ["provider_sku", "unit_price", "provider", "billing_cycle"]);
    const payload = validateBasePayload(body);
    await assertCatalogAllowlist(payload);
    return jsonResponse({ ok: true, quoteAccepted: true }, 200, request);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Invalid request." }, 422, request);
  }
});
