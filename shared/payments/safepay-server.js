import { createHash, randomUUID } from "node:crypto";

// SafePay's protocol requires MD5 request signing. We keep the merchant secret
// server-side only and require a separate signed status lookup before credits
// are applied, so the create-session response is never treated as proof of payment.
function md5(value) {
	return createHash("md5").update(String(value)).digest("hex");
}

const DEFAULT_ALLOWED_CHECKOUT_HOSTS = new Set([
	"www.safepayto.me",
	"safepayto.me",
	"loyalty.safepayto.me",
]);

export function buildPaymentHash({
	amountMinor,
	currency,
	merchantId,
	merchantSecret,
}) {
	return md5(`${amountMinor}${currency}${merchantId}${merchantSecret}`);
}

export function buildRequestHash({ invoice, merchantId, merchantSecret }) {
	return md5(`${invoice}${merchantId}${merchantSecret}`);
}

export function extractProviderTransactionId(checkoutUrl) {
	try {
		const parsedUrl = new URL(checkoutUrl);
		const transParam = parsedUrl.searchParams.get("trans_id");

		if (!transParam) {
			return null;
		}

		const [, providerTransactionId = ""] = transParam.split(",");
		return providerTransactionId || null;
	} catch {
		return null;
	}
}

export function parseCreatePaymentResponse(
	responseText,
	{ allowedHosts = DEFAULT_ALLOWED_CHECKOUT_HOSTS } = {},
) {
	const normalizedResponse = String(responseText || "").trim();
	const [statusLine, checkoutUrl] = normalizedResponse
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (statusLine !== "OK" || !checkoutUrl) {
		throw new Error("Unexpected SafePay create-payment response.");
	}

	let parsedUrl;

	try {
		parsedUrl = new URL(checkoutUrl);
	} catch {
		throw new Error("SafePay returned an invalid checkout URL.");
	}

	if (parsedUrl.protocol !== "https:") {
		throw new Error("SafePay checkout URL must use HTTPS.");
	}

	const normalizedAllowedHosts = new Set(
		[...allowedHosts].map((host) =>
			String(host || "")
				.trim()
				.toLowerCase(),
		),
	);

	if (!normalizedAllowedHosts.has(parsedUrl.hostname.toLowerCase())) {
		throw new Error("SafePay returned an unexpected checkout host.");
	}

	const providerTransactionId = extractProviderTransactionId(checkoutUrl);

	if (!providerTransactionId) {
		throw new Error(
			"SafePay create-payment response did not include a transaction id.",
		);
	}

	return {
		checkoutUrl,
		providerTransactionId,
	};
}

export function buildInvoice({ prefix = "WCT", userId = "" } = {}) {
	const userPrefix = userId ? userId.slice(0, 8) : "guest";
	return `${prefix}-${userPrefix}-${randomUUID()}`;
}
