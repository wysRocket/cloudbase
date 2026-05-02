import { vi, describe, it, expect, afterEach } from "vitest";

vi.stubGlobal("Deno", {
  env: { get: (key: string) => key === "DIGITALOCEAN_API_TOKEN" ? "test-token" : undefined },
});

import {
  provisionDroplet,
  executeDropletLifecycle,
  syncDropletStatus,
} from "./digitalocean-droplet";

function mockFetch(body: unknown, status = 200) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("provisionDroplet", () => {
  it("provisions a VPS droplet", async () => {
    mockFetch({ droplet: { id: 111, status: "new", networks: { v4: [] } } }, 202);
    const result = await provisionDroplet({
      serviceType: "vps",
      region: "nyc3",
      displayName: "my-vps",
      metadata: { sizeSlug: "s-2vcpu-4gb", imageSlug: "ubuntu-22-04-x64" },
    });
    expect(result.providerResourceId).toBe("111");
    expect(result.normalizedStatus).toBe("provisioning");
  });

  it("provisions a GPU droplet using metadata.sizeSlug", async () => {
    mockFetch({ droplet: { id: 222, status: "new", networks: { v4: [] } } }, 202);
    const result = await provisionDroplet({
      serviceType: "gpu",
      region: "nyc3",
      displayName: "my-gpu",
      metadata: { sizeSlug: "gpu-h100x1-80gb" },
    });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.size).toBe("gpu-h100x1-80gb");
    expect(result.providerResourceId).toBe("222");
  });

  it("provisions a game_server with user_data", async () => {
    mockFetch({ droplet: { id: 333, status: "new", networks: { v4: [] } } }, 202);
    await provisionDroplet({
      serviceType: "game_server",
      region: "fra1",
      displayName: "my-game",
      metadata: {},
    });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.user_data).toContain("steamcmd");
  });
});

describe("executeDropletLifecycle", () => {
  it("suspends a droplet (power_off)", async () => {
    mockFetch({ action: { id: 1, status: "in-progress" } });
    const status = await executeDropletLifecycle({ action: "suspend", providerResourceId: "111", serviceType: "vps" });
    expect(status).toBe("suspended");
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/droplets/111/actions");
  });

  it("resumes a droplet (power_on)", async () => {
    mockFetch({ action: { id: 2, status: "in-progress" } });
    const status = await executeDropletLifecycle({ action: "resume", providerResourceId: "111", serviceType: "vps" });
    expect(status).toBe("active");
  });

  it("deletes a droplet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    const status = await executeDropletLifecycle({ action: "delete", providerResourceId: "111", serviceType: "vps" });
    expect(status).toBe("deleted");
  });
});

describe("syncDropletStatus", () => {
  it("returns active status and ipv4 when active", async () => {
    mockFetch({
      droplet: {
        status: "active",
        networks: { v4: [{ ip_address: "1.2.3.4", type: "public" }] },
      },
    });
    const result = await syncDropletStatus({ providerResourceId: "111", serviceType: "vps" });
    expect(result.status).toBe("active");
    expect(result.connectionDetails).toEqual({ ipv4: "1.2.3.4" });
  });

  it("returns provisioning for new droplet with no ip", async () => {
    mockFetch({ droplet: { status: "new", networks: { v4: [] } } });
    const result = await syncDropletStatus({ providerResourceId: "111", serviceType: "vps" });
    expect(result.status).toBe("provisioning");
    expect(result.connectionDetails).toBeUndefined();
  });
});
