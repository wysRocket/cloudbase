import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, request);
  }

  try {
    const authHeader = request.headers.get("Authorization");
    const userClient = createUserClient(authHeader);
    const adminClient = createAdminClient();

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "You must be signed in." }, 401, request);
    }

    const { data: isAdmin, error: adminError } = await adminClient.rpc("is_admin", {
      uid: user.id,
    });

    if (adminError || !isAdmin) {
      return jsonResponse({ error: "Admin access required." }, 403, request);
    }

    const body = await request.json();
    const jobId = Number(body?.jobId);

    if (!Number.isInteger(jobId) || jobId <= 0) {
      return jsonResponse({ error: "jobId must be a positive integer." }, 400, request);
    }

    const { data: job, error: requeueError } = await adminClient.rpc("requeue_dead_letter_job", {
      p_job_id: jobId,
    });

    if (requeueError) {
      return jsonResponse(
        { error: "Failed to requeue dead-letter job.", details: requeueError.message },
        500,
        request,
      );
    }

    if (!job) {
      return jsonResponse({ error: "Dead-letter job not found." }, 404, request);
    }

    return jsonResponse({ ok: true, job }, 200, request);
  } catch (error) {
    return jsonResponse(
      { error: "Unexpected error while requeueing dead-letter job.", details: String(error) },
      500,
      request,
    );
  }
});
