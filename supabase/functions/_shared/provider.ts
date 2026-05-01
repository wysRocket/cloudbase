export type InternalProvisionState = "pending" | "active" | "failed" | "deleting";

export type ProviderServicePayload = {
	id: string;
	name?: string;
	region?: string;
	size?: string;
	image?: string;
	ipv4?: string[];
	createdAt?: string;
	state: InternalProvisionState;
};

export type ProvisionRequest = {
	name: string;
	region: string;
	size: string;
	image: string;
	tags?: string[];
};

export type QuoteRequest = {
	region: string;
	size: string;
	quantity?: number;
};
