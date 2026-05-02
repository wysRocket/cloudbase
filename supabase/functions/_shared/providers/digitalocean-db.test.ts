import { vi, describe, it, expect, afterEach } from "vitest";

vi.stubGlobal("Deno", {
  env: { get: (key: string) => key === "DIGITALOCEAN_API_TOKEN" ? "test-token" : undefined },
});

import {
  provisionDb,
  executeDbLifecycle,
  syncDbStatus,
} from "./digitalocean-db";

function mockFetch(body: unknown, status = 200) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status }),
  );
}

afterEach(() => vi.restoreAllMocks());

describe("provisionDb", () => {
  it("provisions managed database", async () => {
    mockFetch(
      {
        database: {
          id: "db-abc123",
          status: "creating",
          connection: {
            host: "db.example.com",
            port: 25060,
            user: "doadmin",
            password: "secret",
            ssl: "require",
          },
        },
      },
      201,
    );

    const result = await provisionDb({
      providerResourceId: "",
      displayName: "my-db",
      region: "nyc3",
      metadata: { engine: "pg", version: "16" },
    });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.digitalocean.com/v2/databases");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("my-db");
    expect(body.engine).toBe("pg");
    expect(body.version).toBe("16");
    expect(body.region).toBe("nyc3");
    expect(body.size).toBe("db-s-1vcpu-1gb");
    expect(body.num_nodes).toBe(1);

    expect(result).toEqual({
      providerResourceId: "db-abc123",
      normalizedStatus: "provisioning",
      connectionDetails: {
        host: "db.example.com",
        port: "25060",
        user: "doadmin",
        password: "secret",
        ssl: "require",
      },
    });
  });

  it("uses default engine and version when absent", async () => {
    mockFetch(
      {
        database: {
          id: "db-abc123",
          status: "creating",
          connection: { host: "h", port: 5432, user: "u", password: "p", ssl: "require" },
        },
      },
      201,
    );

    await provisionDb({
      providerResourceId: "",
      displayName: "my-db",
      region: "nyc3",
      metadata: {},
    });

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.engine).toBe("pg");
    expect(body.version).toBe("16");
  });

  it("handles missing connection in initial response", async () => {
    mockFetch(
      {
        database: {
          id: "db-abc123",
          status: "creating",
        },
      },
      201,
    );

    const result = await provisionDb({
      providerResourceId: "",
      displayName: "my-db",
      region: "nyc3",
      metadata: { engine: "pg", version: "16" },
    });

    expect(result.providerResourceId).toBe("db-abc123");
    expect(result.normalizedStatus).toBe("provisioning");
    expect(result.connectionDetails).toBeUndefined();
  });
});

describe("executeDbLifecycle", () => {
  it("deletes database", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await executeDbLifecycle({ providerResourceId: "db-abc123", action: "delete" });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.digitalocean.com/v2/databases/db-abc123");
    expect(init.method).toBe("DELETE");
    expect(result).toBe("deleted");
  });

  it("throws for suspend/resume without calling fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      executeDbLifecycle({ providerResourceId: "db-abc123", action: "suspend" }),
    ).rejects.toThrow("cannot be suspended");

    fetchSpy.mockClear();

    await expect(
      executeDbLifecycle({ providerResourceId: "db-abc123", action: "resume" }),
    ).rejects.toThrow("cannot be suspended");

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("syncDbStatus", () => {
  it("maps online to active and returns connection", async () => {
    mockFetch({
      database: {
        id: "db-abc123",
        status: "online",
        connection: {
          host: "db.example.com",
          port: 25060,
          user: "doadmin",
          password: "secret",
          ssl: "require",
        },
      },
    });

    const result = await syncDbStatus({ providerResourceId: "db-abc123" });

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.digitalocean.com/v2/databases/db-abc123");

    expect(result).toEqual({
      status: "active",
      connectionDetails: {
        host: "db.example.com",
        port: "25060",
        user: "doadmin",
        password: "secret",
        ssl: "require",
      },
    });
  });
});
