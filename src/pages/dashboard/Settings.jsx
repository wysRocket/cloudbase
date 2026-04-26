import { useEffect, useState } from "react";
import {
	getMissingCustomerFields,
	normalizeCustomerProfile,
} from "../../../shared/payments/customer.js";
import { useAuth } from "../../context/AuthContext";
import CountrySelect from "../../components/CountrySelect";
import {
	emptyCustomerProfile,
	loadProfile,
	saveProfile,
} from "../../lib/profileService";

function formatMissingField(field) {
	return field
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (value) => value.toUpperCase());
}

export default function Settings() {
	const { user } = useAuth();
	const [profile, setProfile] = useState(emptyCustomerProfile);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		let isMounted = true;

		async function hydrateProfile() {
			if (!user) {
				setLoading(false);
				return;
			}

			try {
				const { profile: loadedProfile } = await loadProfile(user);
				if (isMounted) {
					setProfile(loadedProfile);
				}
			} catch (nextError) {
				if (isMounted) {
					setError(
						nextError instanceof Error
							? nextError.message
							: "Unable to load your profile.",
					);
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		}

		hydrateProfile();

		return () => {
			isMounted = false;
		};
	}, [user]);

	const missingFields = getMissingCustomerFields({
		...profile,
		email: profile.email || user?.email || "",
	});

	const handleFieldChange = (field, value) => {
		setProfile((current) => ({
			...current,
			[field]: value,
		}));
	};

	const handleSave = async () => {
		if (!user) {
			return;
		}

		setSaving(true);
		setMessage("");
		setError("");

		try {
			const normalized = normalizeCustomerProfile({
				...profile,
				email: profile.email || user.email || "",
			});
			const { profile: savedProfile } = await saveProfile(user, normalized);
			setProfile(savedProfile);
			setMessage("Billing profile saved.");
		} catch (nextError) {
			setError(
				nextError instanceof Error
					? nextError.message
					: "Unable to save your billing profile.",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="max-w-3xl mx-auto">
			<h1 className="text-3xl font-bold mb-8">Account Settings</h1>

			<div className="space-y-6">
				<div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
					<h2 className="text-xl font-bold mb-2">Billing Profile</h2>
					<p className="text-sm text-slate-400 mb-6">
						This information is used to prefill your SafePay hosted checkout.
					</p>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="settings-first-name"
								className="block text-xs font-medium text-slate-500 mb-1 uppercase"
							>
								First Name
							</label>
							<input
								id="settings-first-name"
								type="text"
								value={profile.firstName}
								onChange={(event) =>
									handleFieldChange("firstName", event.target.value)
								}
								className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
							/>
						</div>
						<div>
							<label
								htmlFor="settings-last-name"
								className="block text-xs font-medium text-slate-500 mb-1 uppercase"
							>
								Last Name
							</label>
							<input
								id="settings-last-name"
								type="text"
								value={profile.lastName}
								onChange={(event) =>
									handleFieldChange("lastName", event.target.value)
								}
								className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
							/>
						</div>
						<div>
							<label
								htmlFor="settings-email"
								className="block text-xs font-medium text-slate-500 mb-1 uppercase"
							>
								Email
							</label>
							<input
								id="settings-email"
								type="text"
								readOnly
								value={profile.email || user?.email || ""}
								className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-300 cursor-not-allowed"
							/>
						</div>
						<div>
							<label
								htmlFor="settings-phone"
								className="block text-xs font-medium text-slate-500 mb-1 uppercase"
							>
								Phone
							</label>
							<input
								id="settings-phone"
								type="text"
								value={profile.phone}
								onChange={(event) =>
									handleFieldChange("phone", event.target.value)
								}
								className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
							/>
						</div>
						<div>
							<label
								htmlFor="settings-country"
								className="block text-xs font-medium text-slate-500 mb-1 uppercase"
							>
								Country
							</label>
							<CountrySelect
								id="settings-country"
								value={profile.countryCode}
								onChange={(code) => handleFieldChange("countryCode", code)}
								className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
							/>
						</div>
						<div>
							<label
								htmlFor="settings-city"
								className="block text-xs font-medium text-slate-500 mb-1 uppercase"
							>
								City
							</label>
							<input
								id="settings-city"
								type="text"
								value={profile.city}
								onChange={(event) =>
									handleFieldChange("city", event.target.value)
								}
								className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
							/>
						</div>
					</div>

					<div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div className="text-sm text-slate-400">
							{missingFields.length > 0
								? `Missing checkout fields: ${missingFields
										.map(formatMissingField)
										.join(", ")}`
								: "Your billing profile is ready for SafePay checkout."}
						</div>
						<button
							type="button"
							onClick={handleSave}
							disabled={loading || saving}
							className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 text-white rounded-xl font-bold transition-colors"
						>
							{saving ? "Saving..." : "Save Billing Profile"}
						</button>
					</div>

					{message && (
						<p className="mt-4 text-sm text-emerald-300">{message}</p>
					)}
					{error && <p className="mt-4 text-sm text-red-300">{error}</p>}
					{loading && <p className="mt-4 text-sm text-slate-400">Loading...</p>}
				</div>

				<div className="bg-[#0f1629] border border-white/10 rounded-2xl p-6 border-red-500/20">
					<h2 className="text-xl font-bold mb-2 text-red-400">Danger Zone</h2>
					<p className="text-slate-400 text-sm mb-6">
						Once you delete your account, there is no going back. Please be
						certain.
					</p>
					<button
						type="button"
						className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold border border-red-500/20 transition-all"
					>
						Delete Account
					</button>
				</div>
			</div>
		</div>
	);
}
