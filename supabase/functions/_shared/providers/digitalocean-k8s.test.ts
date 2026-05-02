import { vi, describe, it, expect, afterEach } from "vitest";

vi.stubGlobal("Deno", {
  env: { get: (key: string) => key === "DIGITALOCEAN_API_TOKEN" ? "test-token" : undefined },
});

import {
  provisionK8s,
  executeK8sLifecycle,
  syncK8sStatus,
} from "./digitalocean-k8s";

function mockFetch(body: unknown, status = 200) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("provisionK8s", () => {
  it("creates a DOKS cluster", async () => {
    mockFetch({ kubernetes_cluster: { id: "k8s-abc123", status: { state: "provisioning" } } }, 201);
    const result = await provisionK8s({
      providerResourceId: "",
      displayName: "my-cluster",
      region: "nyc3",
      metadata: { nodeSize: "s-2vcpu-4gb" },
    });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.digitalocean.com/v2/kubernetes/clusters");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("my-cluster");
    expect(body.region).toBe("nyc3");
    expect(body.node_pools[0].size).toBe("s-2vcpu-4gb");
    expect(body.node_pools[0].count).toBe(1);

    expect(result).toEqual({ providerResourceId: "k8s-abc123", status: "provisioning" });
  });

  it("uses default node size when metadata.nodeSize is absent", async () => {
    mockFetch({ kubernetes_cluster: { id: "k8s-abc123", status: { state: "provisioning" } } }, 201);
    await provisionK8s({
      providerResourceId: "",
      displayName: "my-cluster",
      region: "nyc3",
      metadata: {},
    });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.node_pools[0].size).toBe("s-2vcpu-4gb");
  });
});

describe("executeK8sLifecycle", () => {
  it("deletes a cluster", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await executeK8sLifecycle({ providerResourceId: "k8s-abc123", action: "delete" });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.digitalocean.com/v2/kubernetes/clusters/k8s-abc123");
    expect(init.method).toBe("DELETE");
    expect(result).toBe("deleted");
  });

  it("throws for suspend action without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      executeK8sLifecycle({ providerResourceId: "k8s-abc123", action: "suspend" }),
    ).rejects.toThrow("cannot be suspended");

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("syncK8sStatus", () => {
  it("maps running state to active", async () => {
    mockFetch({ kubernetes_cluster: { id: "k8s-abc123", status: { state: "running" } } });
    const result = await syncK8sStatus({ providerResourceId: "k8s-abc123" });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.digitalocean.com/v2/kubernetes/clusters/k8s-abc123");
    expect(result).toEqual({ status: "active" });
  });
});
