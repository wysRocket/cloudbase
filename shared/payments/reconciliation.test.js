import { summarizeRefreshResult } from "./reconciliation.js";

describe("payment reconciliation", () => {
	it("keeps pending payments non-crediting", () => {
		expect(
			summarizeRefreshResult({
				currentOrder: { credits_to_add: 1170, status: "processing" },
				providerPayload: {
					status_id: 0,
					payment_system_status: "PENDING",
					transaction_id: "txn_1",
				},
				hasAppliedCredit: false,
			}),
		).toEqual({
			status: "processing",
			isTerminal: false,
			shouldApplyCredits: false,
			balanceDelta: 0,
			providerTransactionId: "txn_1",
		});
	});

	it("credits a successful payment exactly once", () => {
		expect(
			summarizeRefreshResult({
				currentOrder: { credits_to_add: 1170, status: "processing" },
				providerPayload: {
					status_id: 1,
					payment_system_status: "SUCCESS|OK",
					transaction_id: "txn_2",
				},
				hasAppliedCredit: false,
			}),
		).toEqual({
			status: "completed",
			isTerminal: true,
			shouldApplyCredits: true,
			balanceDelta: 1170,
			providerTransactionId: "txn_2",
		});

		expect(
			summarizeRefreshResult({
				currentOrder: { credits_to_add: 1170, status: "completed" },
				providerPayload: {
					status_id: 1,
					payment_system_status: "SUCCESS|OK",
					transaction_id: "txn_2",
				},
				hasAppliedCredit: true,
			}),
		).toEqual({
			status: "completed",
			isTerminal: true,
			shouldApplyCredits: false,
			balanceDelta: 0,
			providerTransactionId: "txn_2",
		});
	});

	it("routes ambiguous non-success states into failed or manual review without granting credits", () => {
		expect(
			summarizeRefreshResult({
				currentOrder: { credits_to_add: 1000, status: "processing" },
				providerPayload: {
					status_id: 4,
					payment_system_status: "DECLINED",
					transaction_id: "txn_3",
				},
				hasAppliedCredit: false,
			}),
		).toEqual({
			status: "failed",
			isTerminal: true,
			shouldApplyCredits: false,
			balanceDelta: 0,
			providerTransactionId: "txn_3",
		});

		expect(
			summarizeRefreshResult({
				currentOrder: { credits_to_add: 1000, status: "processing" },
				providerPayload: {
					status_id: 5,
					payment_system_status: "ESCALATE",
					transaction_id: "txn_4",
				},
				hasAppliedCredit: false,
			}),
		).toEqual({
			status: "manual_review",
			isTerminal: true,
			shouldApplyCredits: false,
			balanceDelta: 0,
			providerTransactionId: "txn_4",
		});
	});
});
