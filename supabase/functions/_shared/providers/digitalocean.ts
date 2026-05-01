export type ServiceType =
	| "vps"
	| "kubernetes"
	| "gpu"
	| "database"
	| "game_server";

export type BillingCycle = "hourly" | "monthly" | "yearly";

export type CatalogQuoteInput = {
	planCode: string;
	region: string;
	quantity: number;
};

export type CatalogQuoteResult = {
	planCode: string;
	currency: string;
	unitPriceCents: number;
	lineTotalCents: number;
	availability: "available" | "unavailable";
	serviceType: ServiceType;
	billingCycle: BillingCycle;
};

type ServiceCatalogRow = {
	plan_code: string;
	service_type: ServiceType;
	billing_cycle: BillingCycle;
	sell_price_cents: number;
};

type QueryResponse<T> = Promise<{ data: T | null; error: { message: string } | null }>;

type ServiceCatalogQuery = {
	select: (columns: string) => {
		eq: (column: string, value: unknown) => {
			eq: (column2: string, value2: unknown) => {
				eq: (column3: string, value3: unknown) => {
					maybeSingle: () => QueryResponse<ServiceCatalogRow>;
				};
			};
		};
	};
};

type AdminClientLike = {
	from: (table: "service_catalog") => ServiceCatalogQuery;
};

function parseNonNegativeInt(value: unknown) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error("Invalid pricing value returned from catalog.");
	}
	return Math.round(parsed);
}

export async function quoteFromCatalog(
	adminClient: AdminClientLike,
	input: CatalogQuoteInput,
): Promise<CatalogQuoteResult> {
	const { data: row, error } = await adminClient
		.from("service_catalog")
		.select("plan_code, service_type, billing_cycle, sell_price_cents")
		.eq("plan_code", input.planCode)
		.eq("region", input.region)
		.eq("is_active", true)
		.maybeSingle();

	if (error) {
		throw new Error(`Unable to read service catalog: ${error.message}`);
	}

	if (!row) {
		return {
			planCode: input.planCode,
			currency: "USD",
			unitPriceCents: 0,
			lineTotalCents: 0,
			availability: "unavailable",
			serviceType: "vps",
			billingCycle: "monthly",
		};
	}

	const unitPriceCents = parseNonNegativeInt(row.sell_price_cents);
	return {
		planCode: row.plan_code,
		currency: "USD",
		unitPriceCents,
		lineTotalCents: unitPriceCents * input.quantity,
		availability: "available",
		serviceType: row.service_type,
		billingCycle: row.billing_cycle,
	};
}
