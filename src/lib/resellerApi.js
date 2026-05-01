import { supabase } from "./supabaseClient";

async function invokeProviderAction(action, payload) {
	const { data, error } = await supabase.functions.invoke(action, {
		body: payload,
	});

	if (error) {
		throw new Error(error.message || `Failed to invoke ${action}`);
	}

	if (data?.error) {
		throw new Error(data.error.message || data.error || `Failed to invoke ${action}`);
	}

	return data;
}

export function triggerProviderLifecycle({ resourceId, operation }) {
	return invokeProviderAction("provider-lifecycle", {
		resource_id: resourceId,
		operation,
	});
}

export function triggerProviderSyncStatus({ resourceId }) {
	return invokeProviderAction("provider-sync-status", {
		resource_id: resourceId,
	});
}
