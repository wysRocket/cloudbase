import {
	getMissingCustomerFields,
	normalizeCustomerProfile,
} from "./customer.js";

describe("payment customer profile helpers", () => {
	it("normalizes user-supplied customer fields into gateway-safe strings", () => {
		expect(
			normalizeCustomerProfile({
				firstName: "  Ada ",
				lastName: " Lovelace  ",
				email: "ada@example.com ",
				phone: " +44 123 456 ",
				countryCode: " gb ",
				city: " London ",
			}),
		).toEqual({
			firstName: "Ada",
			lastName: "Lovelace",
			email: "ada@example.com",
			phone: "+44 123 456",
			countryCode: "GB",
			city: "London",
		});
	});

	it("reports exactly which checkout fields are still missing", () => {
		expect(
			getMissingCustomerFields({
				firstName: "Ada",
				lastName: "",
				email: "ada@example.com",
				phone: null,
				countryCode: "GB",
				city: "London",
			}),
		).toEqual(["lastName", "phone"]);
	});
});
