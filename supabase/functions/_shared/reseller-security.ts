import { createHash } from "https://deno.land/std@0.224.0/crypto/mod.ts";

export type ProvisionRequest = {
  plan: string;
  region: string;
  serviceType: string;
  config?: Record<string, unknown>;
};

export type LifecycleRequest = {
  action: "start" | "stop" | "restart" | "suspend" | "resume" | "terminate";
  resourceId: string;
};

export function parseJsonBody(request: Request): Promise<unknown> {
  return request.json();
}

export function assertProvisionRequest(body: unknown): ProvisionRequest {
  if (!body || typeof body !== "object") throw new Error("Invalid JSON body.");
  const value = body as Record<string, unknown>;
  const plan = String(value.plan || "").trim();
  const region = String(value.region || "").trim();
  const serviceType = String(value.serviceType || "").trim();
  if (!plan || !region || !serviceType) throw new Error("plan, region and serviceType are required.");
  if (value.config && (typeof value.config !== "object" || Array.isArray(value.config))) {
    throw new Error("config must be an object when provided.");
  }
  return { plan, region, serviceType, config: (value.config as Record<string, unknown> | undefined) };
}

export function assertLifecycleRequest(body: unknown): LifecycleRequest {
  if (!body || typeof body !== "object") throw new Error("Invalid JSON body.");
  const value = body as Record<string, unknown>;
  const action = String(value.action || "").trim() as LifecycleRequest["action"];
  const resourceId = String(value.resourceId || "").trim();
  if (!resourceId) throw new Error("resourceId is required.");
  if (!["start", "stop", "restart", "suspend", "resume", "terminate"].includes(action)) {
    throw new Error("Invalid lifecycle action.");
  }
  return { action, resourceId };
}

function csvToSet(value: string | undefined): Set<string> {
  return new Set((value || "").split(",").map((v) => v.trim()).filter(Boolean));
}

export function assertAllowlisted(input: ProvisionRequest) {
  const plans = csvToSet(Deno.env.get("RESELLER_ALLOWED_PLANS"));
  const regions = csvToSet(Deno.env.get("RESELLER_ALLOWED_REGIONS"));
  const serviceTypes = csvToSet(Deno.env.get("RESELLER_ALLOWED_SERVICE_TYPES"));

  if (plans.size && !plans.has(input.plan)) throw new Error(`Plan '${input.plan}' is not allowed.`);
  if (regions.size && !regions.has(input.region)) throw new Error(`Region '${input.region}' is not allowed.`);
  if (serviceTypes.size && !serviceTypes.has(input.serviceType)) throw new Error(`Service type '${input.serviceType}' is not allowed.`);
}

export async function enforceQuota(adminClient: any, userId: string, action: string) {
  const { data, error } = await adminClient.rpc("enforce_reseller_quota", {
    p_user_id: userId,
    p_action: action,
  });
  if (error) throw new Error(`Quota check failed: ${error.message}`);
  if (!data?.allowed) throw new Error(data?.reason || "Rate limit exceeded.");
}

export async function writeAudit(adminClient: any, params: {
  actor: string;
  operation: string;
  resourceId?: string;
  requestId: string;
  correlationId: string;
  payload: Record<string, unknown>;
}) {
  const { error } = await adminClient.from("reseller_audit_logs").insert({
    actor_id: params.actor,
    operation: params.operation,
    resource_id: params.resourceId ?? null,
    request_id: params.requestId,
    correlation_id: params.correlationId,
    payload: params.payload,
  });
  if (error) throw new Error(`Failed to write audit log: ${error.message}`);
}

export function correlationFromRequest(request: Request) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") || createHash("sha256").update(requestId).digest("hex");
  return { requestId, correlationId };
}

export function validateResellerEnv() {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((name) => !Deno.env.get(name));
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
