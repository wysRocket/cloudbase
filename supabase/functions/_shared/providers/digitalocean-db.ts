import type {
	LifecycleArgs,
	ProvisionArgs,
	ProvisionResult,
	SyncArgs,
	SyncResult,
} from "./digitalocean-api.ts";
import { buildResourceTags } from "./digitalocean-api.ts";

const DEFAULT_ENGINE = "pg";
const DEFAULT_VERSION = "16";
const DEFAULT_SIZE = "db-s-1vcpu-1gb";
const BASE_URL = "https://api.digitalocean.com/v2";

function getToken(): string {
	const token = Deno.env.get("DIGITALOCEAN_API_TOKEN");
	if (!token) throw new Error("Missing DIGITALOCEAN_API_TOKEN.");
	return token;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${getToken()}`,
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});
	const text = await res.text();
	let payload: unknown = null;
	if (text) {
		try {
			payload = JSON.parse(text);
		} catch {
			payload = { raw: text };
		}
	}
	if (!res.ok)
		throw new Error(`DO API ${res.status}: ${JSON.stringify(payload)}`);
	return payload as T;
}

function mapState(state: string): string {
	if (state === "online") return "active";
	if (
		state === "creating" ||
		state === "migrating" ||
		state === "forking" ||
		state === "rebuilding" ||
		state === "rebalancing"
	)
		return "provisioning";
	return "error";
}

function extractConnection(
	conn?: Record<string, unknown>,
): Record<string, string> | undefined {
	if (!conn) return undefined;
	return {
		host: String(conn.host ?? ""),
		port: String(conn.port ?? ""),
		user: String(conn.user ?? ""),
		password: String(conn.password ?? ""),
		ssl: String(conn.ssl ?? ""),
	};
}

export async function provisionDb(
	args: ProvisionArgs,
): Promise<ProvisionResult> {
	const engine = String(args.metadata.engine || DEFAULT_ENGINE);
	const version = String(args.metadata.version || DEFAULT_VERSION);

	const created = await apiRequest<{
		database: {
			id: string;
			status: string;
			connection?: Record<string, unknown>;
		};
	}>("/databases", {
		method: "POST",
		body: JSON.stringify({
			name: args.displayName,
			engine,
			version,
			region: args.region,
			size: DEFAULT_SIZE,
			num_nodes: 1,
			tags: buildResourceTags(args, "database"),
		}),
	});

	const db = created.database;
	const result: ProvisionResult = {
		providerResourceId: db.id,
		normalizedStatus: mapState(db.status),
	};

	const connectionDetails = extractConnection(db.connection);
	if (connectionDetails !== undefined) {
		result.connectionDetails = connectionDetails;
	}

	return result;
}

export async function executeDbLifecycle(args: LifecycleArgs): Promise<string> {
	if (args.action === "suspend" || args.action === "resume") {
		throw new Error(
			"Managed databases cannot be suspended — delete and recreate instead.",
		);
	}

	if (args.action === "delete") {
		await apiRequest(`/databases/${args.providerResourceId}`, {
			method: "DELETE",
		});
		return "deleted";
	}

	throw new Error(
		`Unsupported lifecycle action '${args.action}' for managed databases.`,
	);
}

export async function syncDbStatus(args: SyncArgs): Promise<SyncResult> {
	const result = await apiRequest<{
		database: {
			id: string;
			status: string;
			connection?: Record<string, unknown>;
		};
	}>(`/databases/${args.providerResourceId}`);

	const db = result.database;
	return {
		status: mapState(db.status),
		connectionDetails: extractConnection(db.connection),
	};
}
