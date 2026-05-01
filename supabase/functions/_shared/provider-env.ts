function requiredEnv(name: string) {
	const value = Deno.env.get(name);
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export const providerEnv = (() => ({
	digitalOceanToken: requiredEnv("DO_API_TOKEN"),
}))();
