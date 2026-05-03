import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./digitalocean-droplet.ts", () => ({
	provisionDroplet: vi.fn().mockResolvedValue({
		providerResourceId: "drop-1",
		normalizedStatus: "provisioning",
	}),
	executeDropletLifecycle: vi.fn().mockResolvedValue("deleted"),
	syncDropletStatus: vi.fn().mockResolvedValue({ status: "active" }),
}));

vi.mock("./digitalocean-k8s.ts", () => ({
	provisionK8s: vi.fn().mockResolvedValue({
		providerResourceId: "k8s-1",
		normalizedStatus: "provisioning",
	}),
	executeK8sLifecycle: vi.fn().mockResolvedValue("deleted"),
	syncK8sStatus: vi.fn().mockResolvedValue({ status: "active" }),
}));

vi.mock("./digitalocean-db.ts", () => ({
	provisionDb: vi.fn().mockResolvedValue({
		providerResourceId: "db-1",
		normalizedStatus: "provisioning",
	}),
	executeDbLifecycle: vi.fn().mockResolvedValue("deleted"),
	syncDbStatus: vi.fn().mockResolvedValue({ status: "active" }),
}));

import {
	provisionResource,
	syncResourceStatus,
	executeLifecycleAction,
} from "./digitalocean-api";
import { provisionDroplet, syncDropletStatus } from "./digitalocean-droplet";
import { provisionK8s } from "./digitalocean-k8s";
import { provisionDb } from "./digitalocean-db";
import { executeDropletLifecycle } from "./digitalocean-droplet";
import { executeK8sLifecycle } from "./digitalocean-k8s";

const baseArgs = {
	providerResourceId: "",
	displayName: "test",
	region: "nyc3",
	metadata: {} as Record<string, unknown>,
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("provisionResource routing", () => {
	it('routes "vps" to provisionDroplet', async () => {
		await provisionResource("vps", baseArgs);
		expect(provisionDroplet).toHaveBeenCalledOnce();
		expect(provisionDroplet).toHaveBeenCalledWith({
			...baseArgs,
			serviceType: "vps",
		});
	});

	it('routes "kubernetes" to provisionK8s', async () => {
		await provisionResource("kubernetes", baseArgs);
		expect(provisionK8s).toHaveBeenCalledOnce();
		expect(provisionK8s).toHaveBeenCalledWith(baseArgs);
	});

	it('routes "database" to provisionDb', async () => {
		await provisionResource("database", baseArgs);
		expect(provisionDb).toHaveBeenCalledOnce();
		expect(provisionDb).toHaveBeenCalledWith(baseArgs);
	});

	it("throws for unknown service type", async () => {
		await expect(provisionResource("unknown", baseArgs)).rejects.toThrow(
			"Unknown service type: unknown",
		);
	});

	it("routes game_server to provisionDroplet with serviceType forwarded", async () => {
		const args = {
			providerResourceId: "",
			displayName: "game",
			region: "nyc3",
			metadata: {},
		};
		await provisionResource("game_server", args);
		expect(provisionDroplet).toHaveBeenCalledWith({
			...args,
			serviceType: "game_server",
		});
	});
});

describe("executeLifecycleAction", () => {
	it("routes vps to executeDropletLifecycle", async () => {
		const args = { providerResourceId: "drop-1", action: "delete" };
		await executeLifecycleAction("vps", args);
		expect(executeDropletLifecycle).toHaveBeenCalledWith(args);
	});

	it("routes kubernetes to executeK8sLifecycle", async () => {
		const args = { providerResourceId: "k8s-1", action: "delete" };
		await executeLifecycleAction("kubernetes", args);
		expect(executeK8sLifecycle).toHaveBeenCalledWith(args);
	});

	it("throws for unknown service type", async () => {
		await expect(
			executeLifecycleAction("unknown", {
				providerResourceId: "x",
				action: "delete",
			}),
		).rejects.toThrow("Unknown service type: unknown");
	});
});

describe("syncResourceStatus routing", () => {
	it('routes "vps" to syncDropletStatus', async () => {
		const syncArgs = { providerResourceId: "123", serviceType: "vps" };
		await syncResourceStatus("vps", syncArgs);
		expect(syncDropletStatus).toHaveBeenCalledOnce();
		expect(syncDropletStatus).toHaveBeenCalledWith(syncArgs);
	});
});
