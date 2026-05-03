import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";

const MAX_MANUAL_CREDITS = 1_000_000;

function parsePayload(body: unknown) {
	const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
	const userId = String(input.userId || "").trim();
	const amount = Number(input.amount);
	const reason = String(input.reason || "").trim();

	if (!userId) {
		throw new Error("Select a user to receive credits.");
	}

	if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_MANUAL_CREDITS) {
		throw new Error(
			`Credit amount must be a whole number between 1 and ${MAX_MANUAL_CREDITS.toLocaleString()}.`,
		);
	}

	if (reason.length < 5 || reason.length > 180) {
		throw new Error("Reason must be between 5 and 180 characters.");
	}

	return { userId, amount, reason };
}

Deno.serve(async (request) => {
	if (request.method === "OPTIONS") {
		return new Response("ok", { headers: getCorsHeaders(request) });
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed." }, 405, request);
	}

	try {
		const authHeader = request.headers.get("Authorization");
		const userClient = createUserClient(authHeader);
		const adminClient = createAdminClient();

		const {
			data: { user },
			error: userError,
		} = await userClient.auth.getUser();

		if (userError || !user) {
			return jsonResponse({ error: "Unauthorized." }, 401, request);
		}

		const { data: adminRole, error: roleError } = await adminClient
			.from("user_roles")
			.select("role")
			.eq("user_id", user.id)
			.eq("role", "admin")
			.maybeSingle();

		if (roleError || !adminRole) {
			return jsonResponse({ error: "Admin access required." }, 403, request);
		}

		const input = parsePayload(await request.json());

		const { data: recipient, error: recipientError } = await adminClient
			.from("profiles")
			.select("id, email")
			.eq("id", input.userId)
			.maybeSingle();

		if (recipientError || !recipient) {
			return jsonResponse({ error: "Recipient profile not found." }, 404, request);
		}

		const { data: transaction, error: insertError } = await adminClient
			.from("credit_transactions")
			.insert({
				user_id: input.userId,
				description: `Manual admin credit top-up: ${input.reason}`,
				amount: input.amount,
				type: "credit",
				status: "completed",
				granted_by: user.id,
			})
			.select("id, user_id, description, amount, type, status, created_at, granted_by")
			.single();

		if (insertError || !transaction) {
			return jsonResponse(
				{ error: "Unable to grant credits.", details: insertError?.message },
				500,
				request,
			);
		}

		return jsonResponse(
			{
				transaction,
				recipient: {
					id: recipient.id,
					email: recipient.email,
				},
			},
			200,
			request,
		);
	} catch (error) {
		return jsonResponse(
			{
				error:
					error instanceof Error
						? error.message
						: "Invalid manual credit adjustment request.",
			},
			422,
			request,
		);
	}
});
