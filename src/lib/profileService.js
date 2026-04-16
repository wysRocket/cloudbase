import {
	customerProfileFromProfileRow,
	profileRowFromCustomerProfile,
} from "../../shared/payments/customer.js";
import { supabase } from "./supabaseClient";

export const emptyCustomerProfile = {
	firstName: "",
	lastName: "",
	email: "",
	phone: "",
	countryCode: "",
	city: "",
};

export async function loadProfile(user) {
	if (!user?.id) {
		return { profile: { ...emptyCustomerProfile }, row: null };
	}

	const { data, error } = await supabase
		.from("profiles")
		.select(
			"id, email, first_name, last_name, phone, country_code, city, created_at, updated_at",
		)
		.eq("id", user.id)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return {
		profile: customerProfileFromProfileRow(data || {}, user.email || ""),
		row: data,
	};
}

export async function saveProfile(user, customerProfile) {
	if (!user?.id) {
		throw new Error("You must be signed in to save your billing profile.");
	}

	const payload = {
		id: user.id,
		...profileRowFromCustomerProfile({
			...customerProfile,
			email: customerProfile.email || user.email || "",
		}),
	};

	const { data, error } = await supabase
		.from("profiles")
		.upsert(payload, { onConflict: "id" })
		.select(
			"id, email, first_name, last_name, phone, country_code, city, created_at, updated_at",
		)
		.single();

	if (error) {
		throw error;
	}

	return {
		profile: customerProfileFromProfileRow(data || payload, user.email || ""),
		row: data,
	};
}
