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
	serviceType: ServiceType | null;
	billingCycle: BillingCycle | null;
};

type ServiceCatalogRow = {
	plan_code: string;
	service_type: ServiceType;
	billing_cycle: BillingCycle;
	sell_price_cents: number;
};

type QueryResponse<T> = Promise<{
	data: T | null;
	error: { message: string } | null;
}>;

type EqChain = {
	eq: (column: string, value: unknown) => EqChain;
	maybeSingle: () => QueryResponse<ServiceCatalogRow>;
};

type ServiceCatalogQuery = {
	select: (columns: string) => EqChain;
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
	// Seed data stores plan codes with region suffix (e.g. "do-vps-basic-2vcpu-4gb-nyc3").
	// Try that form first, then fall back to the legacy region-as-column approach.
	const regionalPlanCode = `${input.planCode}-${input.region}`;

	let { data: row, error } = await adminClient
		.from("service_catalog")
		.select("plan_code, service_type, billing_cycle, sell_price_cents")
		.eq("plan_code", regionalPlanCode)
		.eq("is_active", true)
		.maybeSingle();

	if (error) {
		throw new Error(`Unable to read service catalog: ${error.message}`);
	}

	if (!row) {
		const { data: fallbackRow, error: fallbackError } = await adminClient
			.from("service_catalog")
			.select("plan_code, service_type, billing_cycle, sell_price_cents")
			.eq("plan_code", input.planCode)
			.eq("region", input.region)
			.eq("is_active", true)
			.maybeSingle();

		if (fallbackError) {
			throw new Error(`Unable to read service catalog: ${fallbackError.message}`);
		}

		row = fallbackRow;
	}

	if (!row) {
		return {
			planCode: input.planCode,
			currency: "USD",
			unitPriceCents: 0,
			lineTotalCents: 0,
			availability: "unavailable",
			serviceType: null,
			billingCycle: null,
		};
	}

	const unitPriceCents = parseNonNegativeInt(row.sell_price_cents);
	return {
		planCode: row.plan_code,
		currency: "USD",
		unitPriceCents,
		lineTotalCents: (() => {
			const total = unitPriceCents * input.quantity;
			if (!Number.isSafeInteger(total))
				throw new Error("Total price calculation exceeds safe integer range.");
			return total;
		})(),
		availability: "available",
		serviceType: row.service_type,
		billingCycle: row.billing_cycle,
	};
}
