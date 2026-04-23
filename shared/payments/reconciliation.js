import { classifyPaymentState } from "./catalog.js";

export function summarizeRefreshResult({
	currentOrder,
	providerPayload,
	hasAppliedCredit,
}) {
	const classified = classifyPaymentState({
		statusId: providerPayload?.status_id,
		providerStatusText: providerPayload?.payment_system_status,
	});

	return {
		status: classified.status,
		isTerminal: classified.isTerminal,
		shouldApplyCredits: classified.shouldCredit && !hasAppliedCredit,
		balanceDelta:
			classified.shouldCredit && !hasAppliedCredit
				? Number(currentOrder?.credits_to_add || 0)
				: 0,
		providerTransactionId: providerPayload?.transaction_id ?? null,
	};
}
