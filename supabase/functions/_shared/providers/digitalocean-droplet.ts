import type { LifecycleArgs, ProvisionArgs, ProvisionResult, SyncArgs, SyncResult } from "./digitalocean-api.ts";

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
  if (!res.ok) throw new Error(`DO API ${res.status}: ${JSON.stringify(payload)}`);
  return payload as T;
}

function normalizeDOStatus(status: string): string {
  if (status === "active") return "active";
  if (status === "off") return "suspended";
  if (status === "archive") return "deleted";
  return "provisioning";
}

const STEAMCMD_USER_DATA = `#!/bin/bash
apt-get update -y
apt-get install -y lib32gcc-s1 wget
mkdir -p /opt/steamcmd && cd /opt/steamcmd
wget -q https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz
tar -xzf steamcmd_linux.tar.gz`;

export async function provisionDroplet(args: ProvisionArgs): Promise<ProvisionResult> {
  let size: string;
  let image: string;
  let userData: string | undefined;

  if (args.serviceType === "gpu") {
    size = String(args.metadata.sizeSlug || "gpu-h100x1-80gb");
    image = "ubuntu-22-04-x64";
  } else if (args.serviceType === "game_server") {
    size = String(args.metadata.sizeSlug || "s-2vcpu-4gb");
    image = "ubuntu-22-04-x64";
    userData = STEAMCMD_USER_DATA;
  } else {
    size = String(args.metadata.sizeSlug || "s-1vcpu-2gb");
    image = String(args.metadata.imageSlug || "ubuntu-22-04-x64");
  }

  const body: Record<string, unknown> = { name: args.displayName, region: args.region, size, image, monitoring: true };
  if (userData) body.user_data = userData;

  const created = await apiRequest<{ droplet: { id: number; status: string; networks: { v4: { ip_address: string; type: string }[] } } }>(
    "/droplets",
    { method: "POST", body: JSON.stringify(body) },
  );

  const publicIp = created.droplet.networks?.v4?.find((n) => n.type === "public")?.ip_address;

  return {
    providerResourceId: String(created.droplet.id),
    normalizedStatus: normalizeDOStatus(created.droplet.status),
    connectionDetails: publicIp ? { ipv4: publicIp } : undefined,
  };
}

export async function executeDropletLifecycle(args: LifecycleArgs): Promise<string> {
  const id = args.providerResourceId;
  if (!/^\d+$/.test(id)) throw new Error("Invalid droplet ID.");

  switch (args.action) {
    case "suspend":
      await apiRequest(`/droplets/${id}/actions`, { method: "POST", body: JSON.stringify({ type: "power_off" }) });
      return "suspended";
    case "resume":
      await apiRequest(`/droplets/${id}/actions`, { method: "POST", body: JSON.stringify({ type: "power_on" }) });
      return "active";
    case "delete":
      await apiRequest(`/droplets/${id}`, { method: "DELETE" });
      return "deleted";
    default:
      throw new Error(`Unsupported lifecycle action '${args.action}' for droplets.`);
  }
}

export async function syncDropletStatus(args: SyncArgs): Promise<SyncResult> {
  if (!/^\d+$/.test(args.providerResourceId)) throw new Error("Invalid droplet ID.");
  const result = await apiRequest<{
    droplet: { status: string; networks: { v4: { ip_address: string; type: string }[] } };
  }>(`/droplets/${args.providerResourceId}`);

  const status = normalizeDOStatus(result.droplet.status);
  const publicIp = result.droplet.networks?.v4?.find((n) => n.type === "public")?.ip_address;

  return {
    status,
    connectionDetails: publicIp ? { ipv4: publicIp } : undefined,
  };
}
