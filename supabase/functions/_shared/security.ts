import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase.ts";

const PLAN_ALLOWLIST = new Set(["starter", "pro", "business", "enterprise"]);
const REGION_ALLOWLIST = new Set(["us-east", "eu-west", "ap-south"]);
const SERVICE_TYPE_ALLOWLIST = new Set([
	"vps",
	"k8s",
	"gpu",
	"database",
	"gameserver",
]);

const REQUIRED_ENV = [
	"SAFEPAY_MERCHANT_ID",
	"SAFEPAY_MERCHANT_SECRET",
	"RESEND_API_KEY",
	"SECRET_ROTATION_CHECKLIST_ACK",
	"SAFEPAY_MERCHANT_SECRET_VERSION",
	"RESEND_API_KEY_VERSION",
] as const;

for (const envName of REQUIRED_ENV) {
	if (!Deno.env.get(envName)) {
		throw new Error(`Startup env validation failed: missing ${envName}`);
	}
}

if (Deno.env.get("SECRET_ROTATION_CHECKLIST_ACK") !== "true") {
	throw new Error(
		"Startup env validation failed: SECRET_ROTATION_CHECKLIST_ACK must be true.",
	);
}

export function readJson<T>(value: unknown, fallback: T): T {
	if (typeof value !== "object" || value === null) return fallback;
	return value as T;
}

export function enforceCatalogAllowlist(payload: Record<string, unknown>) {
	const plan = String(payload.plan ?? "")
		.trim()
		.toLowerCase();
	const region = String(payload.region ?? "")
		.trim()
		.toLowerCase();
	const serviceType = String(payload.serviceType ?? "")
		.trim()
		.toLowerCase();

	if (plan && !PLAN_ALLOWLIST.has(plan))
		throw new Error("Plan is not allowed.");
	if (region && !REGION_ALLOWLIST.has(region))
		throw new Error("Region is not allowed.");
	if (serviceType && !SERVICE_TYPE_ALLOWLIST.has(serviceType))
		throw new Error("Service type is not allowed.");
}

export function requestMeta(request: Request) {
	const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
	const userAgent = request.headers.get("user-agent") ?? "unknown";
	return {
		requestId,
		ipHash: createHash("sha256").update(ip).digest("hex"),
		userAgentHash: createHash("sha256").update(userAgent).digest("hex"),
	};
}

export async function enforceRateLimit(
	userId: string,
	action: string,
	requestId: string,
	perHour: number,
	perDay: number,
) {
	const admin = createAdminClient();
	const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
	const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const [{ count: hourCount, error: hErr }, { count: dayCount, error: dErr }] =
		await Promise.all([
			admin
				.from("function_rate_limits")
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.eq("action", action)
				.gte("created_at", hourAgo),
			admin
				.from("function_rate_limits")
				.select("id", { count: "exact", head: true })
				.eq("user_id", userId)
				.eq("action", action)
				.gte("created_at", dayAgo),
		]);

	if (hErr || dErr) throw new Error("Unable to enforce rate limits.");
	if ((hourCount ?? 0) >= perHour || (dayCount ?? 0) >= perDay)
		throw new Error("Rate limit exceeded for this action.");

	const { error: insertErr } = await admin
		.from("function_rate_limits")
		.insert({ user_id: userId, action, request_id: requestId });
	if (insertErr && insertErr.code !== "23505")
		throw new Error("Unable to persist rate limit state.");
}

export async function writeAuditTrail(args: {
	userId?: string;
	action: string;
	actor: string;
	requestId: string;
	ipHash: string;
	userAgentHash: string;
	payload?: unknown;
}) {
	const admin = createAdminClient();
	await admin.from("function_audit_trail").insert({
		user_id: args.userId ?? null,
		action: args.action,
		actor: args.actor,
		request_id: args.requestId,
		ip_hash: args.ipHash,
		user_agent_hash: args.userAgentHash,
		payload: args.payload ?? null,
	});
}
