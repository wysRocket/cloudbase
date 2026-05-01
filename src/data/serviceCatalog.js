import serviceCatalog from "./serviceCatalog.v1.json";

export function getServicePlans(serviceType) {
	return serviceCatalog.services.filter(
		(service) => service.service_type === serviceType && service.active,
	);
}

export function getServiceCatalogVersion() {
	return serviceCatalog.schemaVersion;
}

export default serviceCatalog;
