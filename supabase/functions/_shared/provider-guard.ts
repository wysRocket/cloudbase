import { createAdminClient } from "./supabase.ts";

const PLAN_CODE_RE = /^[a-z0-9][a-z0-9_-]{1,63}$/i;
const REGION_RE = /^[a-z]{2,3}-[a-z]+-\d$/i;
const IDEMPOTENCY_RE = /^[a-z0-9:_-]{12,128}$/i;

export type ServiceAction = "start" | "stop" | "restart" | "delete";

export interface BasePayload {
  planCode: string;
  region: string;
  service_type: string;
  idempotencyKey: string;
}

export function validateBasePayload(body: unknown): BasePayload {
  const data = body as Record<string, unknown>;
  if (!data || typeof data !== "object") {
    throw new Error("Request body must be an object.");
  }

  const payload: BasePayload = {
    planCode: String(data.planCode ?? "").trim(),
    region: String(data.region ?? "").trim(),
    service_type: String(data.service_type ?? "").trim(),
    idempotencyKey: String(data.idempotencyKey ?? "").trim(),
  };

  if (!PLAN_CODE_RE.test(payload.planCode)) throw new Error("Invalid planCode format.");
  if (!REGION_RE.test(payload.region)) throw new Error("Invalid region format.");
  if (!PLAN_CODE_RE.test(payload.service_type)) throw new Error("Invalid service_type format.");
  if (!IDEMPOTENCY_RE.test(payload.idempotencyKey)) throw new Error("Invalid idempotencyKey format.");

  return payload;
}

export async function assertCatalogAllowlist(payload: BasePayload) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("service_catalog")
    .select("plan_code, region, service_type")
    .eq("is_active", true)
    .eq("plan_code", payload.planCode)
    .eq("region", payload.region)
    .eq("service_type", payload.service_type)
    .maybeSingle();

  if (error) throw new Error(`Catalog lookup failed: ${error.message}`);
  if (!data) throw new Error("planCode/region/service_type are not in active service_catalog.");
}

export async function assertQuota(userId: string, table: string, hours: number, max: number, action?: string) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  let query = admin.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  if (action) query = query.eq("action", action);
  const { count, error } = await query;
  if (error) throw new Error(`Quota check failed: ${error.message}`);
  if ((count ?? 0) >= max) throw new Error("Rate limit exceeded.");
}

export function rejectRestrictedClientFields(body: Record<string, unknown>, restricted: string[]) {
  const supplied = restricted.filter((field) => body[field] !== undefined);
  if (supplied.length > 0) {
    throw new Error(`Client-controlled billing/provider fields are not allowed: ${supplied.join(", ")}`);
  }
}

export function fingerprintRequest(request: Request, userId: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  return `${userId}:${ip}:${ua}`;
}
