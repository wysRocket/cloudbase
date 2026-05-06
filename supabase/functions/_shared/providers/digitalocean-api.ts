import {
	executeDropletLifecycle,
	provisionDroplet,
	syncDropletStatus,
} from "./digitalocean-droplet.ts";
import {
	executeDbLifecycle,
	provisionDb,
	syncDbStatus,
} from "./digitalocean-db.ts";
import {
	executeK8sLifecycle,
	provisionK8s,
	syncK8sStatus,
} from "./digitalocean-k8s.ts";

export interface ProvisionArgs {
	providerResourceId: string;
	displayName: string;
	region: string;
	metadata: Record<string, unknown>;
	serviceType?: string;
	userId?: string;
}

export interface ProvisionResult {
	providerResourceId: string;
	normalizedStatus: string;
	connectionDetails?: Record<string, string>;
}

export interface LifecycleArgs {
	providerResourceId: string;
	action: string;
}

export interface SyncArgs {
	providerResourceId: string;
	serviceType: string;
}

export interface SyncResult {
	status: string;
	connectionDetails?: Record<string, string>;
}

type ServiceType = "vps" | "gpu" | "game_server" | "kubernetes" | "database";

export async function provisionResource(
	serviceType: string,
	args: ProvisionArgs,
): Promise<ProvisionResult> {
	switch (serviceType as ServiceType) {
		case "vps":
		case "gpu":
		case "game_server":
			return provisionDroplet({ ...args, serviceType });
		case "kubernetes":
			return provisionK8s(args);
		case "database":
			return provisionDb(args);
		default:
			throw new Error(`Unknown service type: ${serviceType}`);
	}
}

export async function executeLifecycleAction(
	serviceType: string,
	args: LifecycleArgs,
): Promise<string> {
	switch (serviceType as ServiceType) {
		case "vps":
		case "gpu":
		case "game_server":
			return executeDropletLifecycle(args);
		case "kubernetes":
			return executeK8sLifecycle(args);
		case "database":
			return executeDbLifecycle(args);
		default:
			throw new Error(`Unknown service type: ${serviceType}`);
	}
}

export async function syncResourceStatus(
	serviceType: string,
	args: SyncArgs,
): Promise<SyncResult> {
	switch (serviceType as ServiceType) {
		case "vps":
		case "gpu":
		case "game_server":
			return syncDropletStatus(args);
		case "kubernetes":
			return syncK8sStatus(args);
		case "database":
			return syncDbStatus(args);
		default:
			throw new Error(`Unknown service type: ${serviceType}`);
	}
}
