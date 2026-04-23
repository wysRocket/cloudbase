import { supabase } from "./supabaseClient";

function unwrapFunctionResponse(response, fallbackMessage) {
	if (response.error) {
		throw new Error(response.error.message || fallbackMessage);
	}

	return response.data;
}

export async function createPaymentSession(payload) {
	const response = await supabase.functions.invoke("create-payment-session", {
		body: payload,
	});

	return unwrapFunctionResponse(
		response,
		"Unable to create a payment session right now.",
	);
}

export async function refreshPaymentStatus(payload) {
	const response = await supabase.functions.invoke("refresh-payment-status", {
		body: payload,
	});

	return unwrapFunctionResponse(
		response,
		"Unable to refresh payment status right now.",
	);
}
