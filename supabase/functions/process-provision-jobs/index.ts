import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

const providerProvisionUrl = Deno.env.get("PROVIDER_PROVISION_URL") || "";
const providerProvisionToken = Deno.env.get("PROVIDER_PROVISION_TOKEN") || "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, request);
  }

  const adminClient = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: jobs, error: jobsError } = await adminClient
    .from("provision_jobs")
    .select("id, order_id, order_item_id, user_id, attempts, max_attempts")
    .in("status", ["queued", "retrying"])
    .lte("available_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(10);

  if (jobsError) {
    return jsonResponse({ error: jobsError.message }, 500, request);
  }

  let processed = 0;

  for (const job of jobs || []) {
    processed += 1;
    await adminClient.from("provision_jobs").update({ status: "processing", attempts: job.attempts + 1 }).eq("id", job.id);
    await adminClient.from("provision_events").insert({ job_id: job.id, status: "processing", message: "Provisioning attempt started." });

    const { data: item } = await adminClient
      .from("order_items")
      .select("id, sku, region")
      .eq("id", job.order_item_id)
      .maybeSingle();

    try {
      const payload = { orderId: job.order_id, orderItemId: job.order_item_id, userId: job.user_id, sku: item?.sku, region: item?.region };
      const resp = await fetch(providerProvisionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerProvisionToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(`Provider responded with ${resp.status}`);
      }

      await adminClient.from("provision_jobs").update({ status: "succeeded", provider_request: payload, provider_response: data, last_error: null }).eq("id", job.id);
      await adminClient.from("order_items").update({ status: "provisioned", resource_ref: data?.resourceId || null }).eq("id", job.order_item_id);
      await adminClient.from("provision_events").insert({ job_id: job.id, status: "succeeded", message: "Provisioning finished.", details: data });
    } catch (error) {
      const attempts = job.attempts + 1;
      const terminal = attempts >= job.max_attempts;
      await adminClient
        .from("provision_jobs")
        .update({
          status: terminal ? "failed" : "retrying",
          last_error: error instanceof Error ? error.message : "Unknown provider error",
          available_at: terminal ? nowIso : new Date(Date.now() + 60_000 * attempts).toISOString(),
        })
        .eq("id", job.id);
      await adminClient.from("order_items").update({ status: terminal ? "failed" : "reserved" }).eq("id", job.order_item_id);
      await adminClient.from("provision_events").insert({
        job_id: job.id,
        status: terminal ? "failed" : "retrying",
        message: terminal ? "Provisioning failed permanently." : "Provisioning failed. Job re-queued.",
      });
    }
  }

  return jsonResponse({ processed }, 200, request);
});
