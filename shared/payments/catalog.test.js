import {
	amountMajorToMinor,
	classifyPaymentState,
	creditsFromMinorAmount,
	getCurrencyConfig,
} from "./catalog.js";

describe("payment catalog", () => {
	it("converts decimal amounts into minor units without floating drift", () => {
		expect(amountMajorToMinor("10", "EUR")).toBe(1000);
		expect(amountMajorToMinor("10.00", "EUR")).toBe(1000);
		expect(amountMajorToMinor("10.05", "EUR")).toBe(1005);
		expect(amountMajorToMinor("1.99", "GBP")).toBe(199);
	});

	it("rejects malformed or out-of-range amount strings", () => {
		expect(() => amountMajorToMinor("", "EUR")).toThrow(/valid amount/i);
		expect(() => amountMajorToMinor("12.345", "EUR")).toThrow(/valid amount/i);
		expect(() => amountMajorToMinor("0.50", "EUR")).toThrow(/between/i);
		expect(() => amountMajorToMinor("201.00", "GBP")).toThrow(/between/i);
	});

	it("calculates top-up credits from minor units deterministically", () => {
		expect(creditsFromMinorAmount(1000, "EUR")).toBe(1000);
		expect(creditsFromMinorAmount(1005, "EUR")).toBe(1005);
		expect(creditsFromMinorAmount(100, "GBP")).toBe(117);
		expect(creditsFromMinorAmount(9999, "GBP")).toBe(11698);
	});

	it("classifies provider states conservatively for UI and ledger safety", () => {
		expect(
			classifyPaymentState({ statusId: 1, providerStatusText: "SUCCESS|OK" }),
		).toEqual({ status: "completed", isTerminal: true, shouldCredit: true });
		expect(
			classifyPaymentState({ statusId: 0, providerStatusText: "PENDING" }),
		).toEqual({ status: "processing", isTerminal: false, shouldCredit: false });
		expect(
			classifyPaymentState({ statusId: 10, providerStatusText: "WAITING" }),
		).toEqual({ status: "processing", isTerminal: false, shouldCredit: false });
		expect(
			classifyPaymentState({ statusId: 3, providerStatusText: "DECLINED" }),
		).toEqual({ status: "failed", isTerminal: true, shouldCredit: false });
		expect(
			classifyPaymentState({
				statusId: 5,
				providerStatusText: "UNKNOWN_GATEWAY_STATE",
			}),
		).toEqual({
			status: "manual_review",
			isTerminal: true,
			shouldCredit: false,
		});
	});

	it("exposes the supported checkout currencies and bounds", () => {
		expect(getCurrencyConfig("EUR")).toMatchObject({
			code: "EUR",
			minorUnitScale: 100,
			minAmountMinor: 100,
			maxAmountMinor: 20000,
			creditsPerMajorUnit: 100,
		});
		expect(() => getCurrencyConfig("USD")).toThrow(/unsupported/i);
	});
});
