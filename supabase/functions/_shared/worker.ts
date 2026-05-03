/**
 * Triggers the provision-job-worker Edge Function in a fire-and-forget manner.
 * If the worker call fails the job will still be picked up on the next scheduled run.
 */
export async function triggerWorker(): Promise<void> {
	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const workerSecret = Deno.env.get("PROVISION_WORKER_SECRET");
	if (!supabaseUrl || !workerSecret) return;
	fetch(`${supabaseUrl}/functions/v1/provision-job-worker`, {
		method: "POST",
		headers: { "x-worker-secret": workerSecret },
	}).catch(() => {}); // fire-and-forget
}
