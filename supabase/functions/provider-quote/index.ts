import { getCorsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAdminClient, createUserClient } from "../_shared/supabase.ts";
import { quoteFromCatalog } from "../_shared/providers/digitalocean.ts";

function parsePayload(body: unknown) {
	const planCode = String((body as any)?.planCode || "").trim();
	const region = String((body as any)?.region || "").trim();
	const quantity = Number((body as any)?.quantity ?? 1);

	if (!planCode) {
		throw new Error("planCode is required.");
	}

	if (!region) {
		throw new Error("region is required.");
	}

	if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
		throw new Error("quantity must be an integer between 1 and 100.");
	}

	return { planCode, region, quantity };
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
			return jsonResponse(
				{ error: "You must be signed in to request a quote." },
				401,
				request,
			);
		}

		const input = parsePayload(await request.json());
		const quote = await quoteFromCatalog(adminClient as any, input);

		if (quote.availability === "unavailable") {
			return jsonResponse(quote, 404, request);
		}

		return jsonResponse(quote, 200, request);
	} catch (error) {
		return jsonResponse(
			{
				error: error instanceof Error ? error.message : "Invalid quote request.",
			},
			422,
			request,
		);
	}
});
