import {
	buildPaymentHash,
	buildRequestHash,
	extractProviderTransactionId,
	parseCreatePaymentResponse,
} from "./safepay-server.js";

describe("SafePay server helpers", () => {
	it("builds the create-payment MD5 signature from provider fields", () => {
		expect(
			buildPaymentHash({
				amountMinor: 100,
				currency: "USD",
				merchantId: "123",
				merchantSecret: "secret",
			}),
		).toBe("0abf5ae321ace048912fee78fc62b554");
	});

	it("builds the request-status MD5 signature from invoice fields", () => {
		expect(
			buildRequestHash({
				invoice: "INV-1000",
				merchantId: "123",
				merchantSecret: "secret",
			}),
		).toBe("98cf25988ca8c719bdff78232b813ddc");
	});

	it("parses the hosted checkout URL and provider transaction id from get_trans=1 responses", () => {
		const parsed = parseCreatePaymentResponse(
			"OK\nhttps://pay.example/form?trans_id=abc123,txn789",
			{ allowedHosts: ["pay.example"] },
		);

		expect(parsed).toEqual({
			checkoutUrl: "https://pay.example/form?trans_id=abc123,txn789",
			providerTransactionId: "txn789",
		});
		expect(
			extractProviderTransactionId(
				"https://pay.example/form?foo=bar&trans_id=abc123,txn900",
			),
		).toBe("txn900");
	});

	it("rejects malformed provider create-payment responses", () => {
		expect(() => parseCreatePaymentResponse("ERROR")).toThrow(/unexpected/i);
		expect(() => parseCreatePaymentResponse("OK\nnot-a-valid-url")).toThrow(
			/valid checkout url/i,
		);
		expect(() =>
			parseCreatePaymentResponse(
				"OK\nhttp://pay.example/form?trans_id=abc,txn1",
				{
					allowedHosts: ["pay.example"],
				},
			),
		).toThrow(/https/i);
		expect(() =>
			parseCreatePaymentResponse(
				"OK\nhttps://evil.example/form?trans_id=abc,txn1",
				{
					allowedHosts: ["pay.example"],
				},
			),
		).toThrow(/unexpected checkout host/i);
		expect(() =>
			parseCreatePaymentResponse("OK\nhttps://pay.example/form?foo=bar", {
				allowedHosts: ["pay.example"],
			}),
		).toThrow(/transaction id/i);
	});
});
