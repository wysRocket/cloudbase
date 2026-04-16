const DEFAULT_ALLOWED_ORIGINS = [
	"http://localhost:3000",
	"http://127.0.0.1:3000",
];

function getAllowedOrigins() {
	const configuredOrigins =
		Deno.env.get("ALLOWED_ORIGINS") || Deno.env.get("ALLOWED_ORIGIN") || "";
	const parsedOrigins = configuredOrigins
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);

	return parsedOrigins.length > 0 ? parsedOrigins : DEFAULT_ALLOWED_ORIGINS;
}

function getRequestOrigin(request?: Request | Headers | string | null) {
	if (!request) {
		return null;
	}

	if (typeof request === "string") {
		return request;
	}

	if (request instanceof Headers) {
		return request.get("Origin");
	}

	return request.headers.get("Origin");
}

export function getCorsHeaders(request?: Request | Headers | string | null) {
	const allowedOrigins = getAllowedOrigins();
	const requestOrigin = getRequestOrigin(request);
	const accessControlOrigin =
		requestOrigin && allowedOrigins.includes(requestOrigin)
			? requestOrigin
			: allowedOrigins[0];

	return {
		"Access-Control-Allow-Origin": accessControlOrigin,
		"Access-Control-Allow-Headers":
			"authorization, x-client-info, apikey, content-type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		Vary: "Origin",
	};
}

export function jsonResponse(
	body: unknown,
	status = 200,
	request?: Request | Headers | string | null,
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...getCorsHeaders(request),
			"Content-Type": "application/json",
		},
	});
}
