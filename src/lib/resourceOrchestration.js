export const NORMALIZED_STATUS = {
	running: "Running",
	provisioning: "Provisioning",
	deleting: "Deleting",
	stopped: "Stopped",
	error: "Error",
	unknown: "Unknown",
};

const rawStatusMap = {
	running: NORMALIZED_STATUS.running,
	online: NORMALIZED_STATUS.running,
	active: NORMALIZED_STATUS.running,
	ready: NORMALIZED_STATUS.running,
	creating: NORMALIZED_STATUS.provisioning,
	starting: NORMALIZED_STATUS.provisioning,
	provisioning: NORMALIZED_STATUS.provisioning,
	deleting: NORMALIZED_STATUS.deleting,
	terminating: NORMALIZED_STATUS.deleting,
	stopped: NORMALIZED_STATUS.stopped,
	offline: NORMALIZED_STATUS.stopped,
	failed: NORMALIZED_STATUS.error,
	error: NORMALIZED_STATUS.error,
};

export function normalizeResourceStatus(status) {
	if (!status) return NORMALIZED_STATUS.unknown;
	const key = String(status).trim().toLowerCase();
	return rawStatusMap[key] || NORMALIZED_STATUS.unknown;
}

export function buildServiceMetadata(typeId, options = {}) {
	if (typeId === "k8s") {
		return {
			controlPlane: "managed",
			nodePools: [{ profile: "general", min: 1, max: 3 }],
			actions: ["create", "status", "delete"],
		};
	}

	if (typeId === "db") {
		return {
			engine: options.dbEngine || "PostgreSQL",
			version: options.dbVersion || "16",
			connection: {
				host: `${options.name || "db"}.internal`,
				port: 5432,
				username: "service_user",
				password: "••••••••••••",
				sslMode: "require",
				privateNetworkOnly: true,
			},
			actions: ["create", "status", "delete"],
		};
	}

	if (typeId === "gpu") {
		const profile = options.gpuProfile || "h100-single";
		const constraints = {
			"h100-single": { minCpu: 16, minMemoryGb: 64, regionAllowlist: ["us-east", "eu-central"] },
			"a100-8x": { minCpu: 64, minMemoryGb: 256, regionAllowlist: ["us-east"] },
		};
		return { gpuProfile: profile, constraints: constraints[profile] || constraints["h100-single"] };
	}

	if (typeId === "game") {
		return {
			bootstrapProfile: "droplet-cloud-init",
			dropletPlan: "c-8",
			cloudInitStrategy: "install-runtime-and-pull-config",
		};
	}

	return {};
}
