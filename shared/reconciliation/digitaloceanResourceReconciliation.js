export function reconcileDigitalOceanResources({ internalResources, providerResources }) {
	const findings = [];
	const internalByProviderId = new Map(
		(internalResources || []).map((resource) => [resource.provider_id, resource]),
	);
	const providerById = new Map(
		(providerResources || []).map((resource) => [resource.id, resource]),
	);

	for (const [providerId, internal] of internalByProviderId.entries()) {
		const provider = providerById.get(providerId);
		if (!provider) {
			findings.push({ type: "missing_provider_resource", providerId, resourceId: internal.id, severity: "high" });
			continue;
		}
		if ((internal.status || "").toLowerCase() !== (provider.status || "").toLowerCase()) {
			findings.push({
				type: "status_mismatch",
				providerId,
				resourceId: internal.id,
				internalStatus: internal.status,
				providerStatus: provider.status,
				severity: "medium",
			});
		}
	}

	for (const [providerId, provider] of providerById.entries()) {
		if (!internalByProviderId.has(providerId)) {
			findings.push({ type: "missing_internal_resource", providerId, providerName: provider.name, severity: "high" });
		}
	}

	return findings;
}

export function shouldRunDailyReconciliation(now = new Date()) {
	return now.getUTCHours() === 3;
}
