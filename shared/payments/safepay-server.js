import { createHash, randomUUID } from "node:crypto";

function md5(value) {
	return createHash("md5").update(String(value)).digest("hex");
}

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

export function parseCreatePaymentResponse(responseText) {
	const normalizedResponse = String(responseText || "").trim();
	const [statusLine, checkoutUrl] = normalizedResponse
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (statusLine !== "OK" || !checkoutUrl) {
		throw new Error("Unexpected SafePay create-payment response.");
	}

	try {
		new URL(checkoutUrl);
	} catch {
		throw new Error("SafePay returned an invalid checkout URL.");
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
