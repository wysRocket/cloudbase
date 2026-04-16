import { createClient } from "npm:@supabase/supabase-js@2";

function getEnv(name: string) {
	const value = Deno.env.get(name);

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export function createUserClient(authHeader: string | null) {
	return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
		global: {
			headers: authHeader ? { Authorization: authHeader } : {},
		},
	});
}

export function createAdminClient() {
	return createClient(
		getEnv("SUPABASE_URL"),
		getEnv("SUPABASE_SERVICE_ROLE_KEY"),
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		},
	);
}
