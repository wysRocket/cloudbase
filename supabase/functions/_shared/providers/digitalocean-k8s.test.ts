import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubGlobal("Deno", {
	env: {
		get: (key: string) =>
			key === "DIGITALOCEAN_API_TOKEN" ? "test-token" : undefined,
	},
});

import {
	clearK8sVersionCache,
	executeK8sLifecycle,
	provisionK8s,
	syncK8sStatus,
} from "./digitalocean-k8s";

function mockFetch(body: unknown, status = 200) {
	vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
		new Response(JSON.stringify(body), { status }),
	);
}

beforeEach(() => clearK8sVersionCache());
afterEach(() => vi.restoreAllMocks());

describe("provisionK8s", () => {
	it("creates a DOKS cluster using version from /kubernetes/options", async () => {
		mockFetch({ options: { default_cluster_version: "1.32.2-do.0" } }, 200);
		mockFetch(
			{
				kubernetes_cluster: {
					id: "k8s-abc123",
					status: { state: "provisioning" },
				},
			},
			201,
		);
		const result = await provisionK8s({
			providerResourceId: "",
			displayName: "my-cluster",
			region: "nyc3",
			metadata: { nodeSize: "s-2vcpu-4gb" },
		});

		const [optionsUrl] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(optionsUrl).toBe(
			"https://api.digitalocean.com/v2/kubernetes/options",
		);

		const [clusterUrl, init] = (fetch as ReturnType<typeof vi.fn>).mock
			.calls[1];
		expect(clusterUrl).toBe(
			"https://api.digitalocean.com/v2/kubernetes/clusters",
		);
		expect(init.method).toBe("POST");

		const body = JSON.parse(init.body as string);
		expect(body.name).toBe("my-cluster");
		expect(body.region).toBe("nyc3");
		expect(body.node_pools[0].size).toBe("s-2vcpu-4gb");
		expect(body.node_pools[0].count).toBe(1);
		expect(body.version).toBe("1.32.2-do.0");

		expect(result).toEqual({
			providerResourceId: "k8s-abc123",
			normalizedStatus: "provisioning",
		});
	});

	it("falls back to hardcoded version when /kubernetes/options fails", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response("error", { status: 500 }),
		);
		mockFetch(
			{
				kubernetes_cluster: {
					id: "k8s-abc123",
					status: { state: "provisioning" },
				},
			},
			201,
		);

		await provisionK8s({
			providerResourceId: "",
			displayName: "my-cluster",
			region: "nyc3",
			metadata: {},
		});

		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
		const body = JSON.parse(init.body as string);
		expect(body.version).toBe("1.32.2-do.0");
	});

	it("uses default node size when metadata.nodeSize is absent", async () => {
		mockFetch({ options: { default_cluster_version: "1.32.2-do.0" } }, 200);
		mockFetch(
			{
				kubernetes_cluster: {
					id: "k8s-abc123",
					status: { state: "provisioning" },
				},
			},
			201,
		);
		await provisionK8s({
			providerResourceId: "",
			displayName: "my-cluster",
			region: "nyc3",
			metadata: {},
		});

		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
		const body = JSON.parse(init.body as string);
		expect(body.node_pools[0].size).toBe("s-2vcpu-4gb");
	});

	it("caches the version so /kubernetes/options is only called once per TTL", async () => {
		mockFetch({ options: { default_cluster_version: "1.33.0-do.0" } }, 200);
		mockFetch(
			{
				kubernetes_cluster: { id: "k8s-1", status: { state: "provisioning" } },
			},
			201,
		);
		mockFetch(
			{
				kubernetes_cluster: { id: "k8s-2", status: { state: "provisioning" } },
			},
			201,
		);

		await provisionK8s({
			providerResourceId: "",
			displayName: "c1",
			region: "nyc3",
			metadata: {},
		});
		await provisionK8s({
			providerResourceId: "",
			displayName: "c2",
			region: "nyc3",
			metadata: {},
		});

		const optionsCalls = (fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
			([url]: [string]) => url.includes("/kubernetes/options"),
		);
		expect(optionsCalls).toHaveLength(1);
	});
});

describe("executeK8sLifecycle", () => {
	it("deletes a cluster", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
			new Response(null, { status: 204 }),
		);
		const result = await executeK8sLifecycle({
			providerResourceId: "k8s-abc123",
			action: "delete",
		});

		const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toBe(
			"https://api.digitalocean.com/v2/kubernetes/clusters/k8s-abc123",
		);
		expect(init.method).toBe("DELETE");
		expect(result).toBe("deleted");
	});

	it("throws for suspend action without calling fetch", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		await expect(
			executeK8sLifecycle({
				providerResourceId: "k8s-abc123",
				action: "suspend",
			}),
		).rejects.toThrow("cannot be suspended");

		fetchSpy.mockClear();

		await expect(
			executeK8sLifecycle({
				providerResourceId: "k8s-abc123",
				action: "resume",
			}),
		).rejects.toThrow("cannot be suspended");

		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe("syncK8sStatus", () => {
	it("maps running state to active", async () => {
		mockFetch({
			kubernetes_cluster: { id: "k8s-abc123", status: { state: "running" } },
		});
		const result = await syncK8sStatus({ providerResourceId: "k8s-abc123" });

		const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(url).toBe(
			"https://api.digitalocean.com/v2/kubernetes/clusters/k8s-abc123",
		);
		expect(result).toEqual({ status: "active" });
	});

	it("maps degraded to error", async () => {
		mockFetch({
			kubernetes_cluster: { id: "k8s-abc123", status: { state: "degraded" } },
		});
		const result = await syncK8sStatus({ providerResourceId: "k8s-abc123" });
		expect(result.status).toBe("error");
	});

	it("maps unknown state to provisioning", async () => {
		mockFetch({
			kubernetes_cluster: { id: "k8s-abc123", status: { state: "new" } },
		});
		const result = await syncK8sStatus({ providerResourceId: "k8s-abc123" });
		expect(result.status).toBe("provisioning");
	});

	it("maps deleted state to deleted", async () => {
		mockFetch({
			kubernetes_cluster: { id: "k8s-abc123", status: { state: "deleted" } },
		});
		const result = await syncK8sStatus({ providerResourceId: "k8s-abc123" });
		expect(result.status).toBe("deleted");
	});

	it("maps terminating state to deleted", async () => {
		mockFetch({
			kubernetes_cluster: {
				id: "k8s-abc123",
				status: { state: "terminating" },
			},
		});
		const result = await syncK8sStatus({ providerResourceId: "k8s-abc123" });
		expect(result.status).toBe("deleted");
	});
});
