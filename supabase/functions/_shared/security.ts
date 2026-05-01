const rateWindowStore = new Map<string, { count: number; resetAt: number }>();

export type AuditMetadata = {
	actorId: string | null;
	requestId: string;
	correlationId: string;
	timestamp: string;
};

export function requireEnvVars(vars: string[]) {
	const missing = vars.filter((name) => !Deno.env.get(name));
	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(", ")}`,
		);
	}
}

export function getAuditMetadata(
	request: Request,
	actorId: string | null,
): AuditMetadata {
	const requestId =
		request.headers.get("x-request-id") ||
		request.headers.get("cf-ray") ||
		crypto.randomUUID();
	const correlationId = request.headers.get("x-correlation-id") || requestId;

	return {
		actorId,
		requestId,
		correlationId,
		timestamp: new Date().toISOString(),
	};
}

export function withAudit<T extends Record<string, unknown>>(
	payload: T,
	audit: AuditMetadata,
): T & { audit_metadata: AuditMetadata } {
	return {
		...payload,
		audit_metadata: audit,
	};
}

export function enforceAllowlist(
	value: string,
	allowlist: readonly string[],
	field: string,
) {
	if (!allowlist.includes(value)) {
		throw new Error(
			`Invalid ${field}. Allowed values: ${allowlist.join(", ")}`,
		);
	}
}

export function assertObject(
	value: unknown,
	name: string,
): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${name} must be an object.`);
	}
	return value as Record<string, unknown>;
}

export function checkRateLimit(
	userId: string,
	endpoint: string,
	maxRequests: number,
	windowMs: number,
) {
	const now = Date.now();
	const key = `${endpoint}:${userId}`;
	const current = rateWindowStore.get(key);

	if (!current || now >= current.resetAt) {
		rateWindowStore.set(key, { count: 1, resetAt: now + windowMs });
		return {
			allowed: true,
			remaining: maxRequests - 1,
			resetAt: now + windowMs,
		};
	}

	if (current.count >= maxRequests) {
		return { allowed: false, remaining: 0, resetAt: current.resetAt };
	}

	current.count += 1;
	rateWindowStore.set(key, current);
	return {
		allowed: true,
		remaining: maxRequests - current.count,
		resetAt: current.resetAt,
	};
}

export function parseContactRequest(rawBody: unknown) {
	const body = assertObject(rawBody, "Request body");
	const firstName = String(body.firstName || "").trim();
	const lastName = String(body.lastName || "").trim();
	const email = String(body.email || "").trim();
	const phone = String(body.phone || "").trim();
	const company = String(body.company || "").trim();
	const cloudSpend = String(body.cloudSpend || "").trim();
	const message = String(body.message || "").trim();

	if (!email || !message) {
		throw new Error("Email and message are required.");
	}

	return { firstName, lastName, email, phone, company, cloudSpend, message };
}

export function parseCreatePaymentRequest(rawBody: unknown) {
	const body = assertObject(rawBody, "Request body");
	const currency = String(body.currency || "")
		.trim()
		.toUpperCase();
	const amount = body.amount;
	const customer = body.customer ? assertObject(body.customer, "customer") : {};
	const serviceType = String(body.serviceType || "credits")
		.trim()
		.toLowerCase();
	const region = String(body.region || "global")
		.trim()
		.toLowerCase();
	const plan = String(body.plan || "topup")
		.trim()
		.toLowerCase();

	return {
		currency,
		amount,
		customer,
		serviceType,
		region,
		plan,
	};
}

export function getEnvOrThrow(name: string) {
	const value = Deno.env.get(name);
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}
