const CURRENCIES = {
	EUR: {
		code: "EUR",
		symbol: "€",
		minorUnitScale: 100,
		minAmountMinor: 100,
		maxAmountMinor: 20000,
		creditsPerMajorUnit: 100,
	},
	GBP: {
		code: "GBP",
		symbol: "£",
		minorUnitScale: 100,
		minAmountMinor: 100,
		maxAmountMinor: 20000,
		creditsPerMajorUnit: 117,
	},
};

const AMOUNT_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const FAILURE_HINTS =
	/(fail|declin|cancel|reject|error|chargeback|refund|void|expire)/i;
const PROCESSING_STATUS_IDS = new Set([0, 10, 11]);

export function getCurrencyConfig(currency) {
	const normalizedCurrency = String(currency || "").toUpperCase();
	const config = CURRENCIES[normalizedCurrency];

	if (!config) {
		throw new Error(`Unsupported payment currency: ${currency}`);
	}

	return config;
}

export function amountMajorToMinor(amount, currency) {
	const normalizedAmount = String(amount || "").trim();

	if (!AMOUNT_PATTERN.test(normalizedAmount)) {
		throw new Error("Enter a valid amount with up to 2 decimal places.");
	}

	if (Number(normalizedAmount) === 0) {
		throw new Error("Amount must be greater than zero.");
	}

	const config = getCurrencyConfig(currency);
	const [wholePart, fractionPart = ""] = normalizedAmount.split(".");
	const amountMinor =
		Number.parseInt(wholePart, 10) * config.minorUnitScale +
		Number.parseInt(fractionPart.padEnd(2, "0"), 10);

	if (
		amountMinor < config.minAmountMinor ||
		amountMinor > config.maxAmountMinor
	) {
		throw new Error(
			`Amount must be between ${formatMinorAmount(config.minAmountMinor, currency)} and ${formatMinorAmount(config.maxAmountMinor, currency)}.`,
		);
	}

	return amountMinor;
}

export function creditsFromMinorAmount(amountMinor, currency) {
	const config = getCurrencyConfig(currency);
	return Math.floor((Number(amountMinor) * config.creditsPerMajorUnit) / 100);
}

export function formatMinorAmount(amountMinor, currency) {
	const config = getCurrencyConfig(currency);
	return `${config.symbol}${(Number(amountMinor) / config.minorUnitScale).toFixed(2)}`;
}

export function classifyPaymentState({ statusId, providerStatusText }) {
	if (Number(statusId) === 1) {
		return {
			status: "completed",
			isTerminal: true,
			shouldCredit: true,
		};
	}

	if (PROCESSING_STATUS_IDS.has(Number(statusId))) {
		return {
			status: "processing",
			isTerminal: false,
			shouldCredit: false,
		};
	}

	if (FAILURE_HINTS.test(String(providerStatusText || ""))) {
		return {
			status: "failed",
			isTerminal: true,
			shouldCredit: false,
		};
	}

	return {
		status: "manual_review",
		isTerminal: true,
		shouldCredit: false,
	};
}

export function listSupportedCurrencies() {
	return Object.values(CURRENCIES);
}
