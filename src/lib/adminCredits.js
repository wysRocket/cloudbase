import { supabase } from "./supabaseClient";

export async function grantManualCredits(payload) {
	const response = await supabase.functions.invoke("admin-credit-adjustment", {
		body: payload,
	});

	if (response.error) {
		let message = response.error.message;

		if (response.error.context instanceof Response) {
			try {
				const body = await response.error.context.clone().json();
				message = body?.error || body?.details || message;
			} catch {
				message = response.error.message;
			}
		}

		throw new Error(message || "Unable to grant manual credits right now.");
	}

	return response.data;
}
