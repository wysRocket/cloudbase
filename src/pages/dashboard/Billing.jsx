import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
	amountMajorToMinor,
	creditsFromMinorAmount,
	formatMinorAmount,
	getCurrencyConfig,
	listSupportedCurrencies,
} from "../../../shared/payments/catalog.js";
import {
	getMissingCustomerFields,
	normalizeCustomerProfile,
} from "../../../shared/payments/customer.js";
import { useAuth } from "../../context/AuthContext";
import CountrySelect from "../../components/CountrySelect";
import { useDashboard } from "../../context/DashboardContext";
import {
	createPaymentSession,
	refreshPaymentStatus,
} from "../../lib/paymentGateway";
import {
	emptyCustomerProfile,
	loadProfile,
	saveProfile,
} from "../../lib/profileService";

const planTiers = [
	{
		name: "Starter",
		credits: 1000,
		price: 10,
		description: "For personal projects and testing",
	},
	{
		name: "Pro Plan",
		credits: 2900,
		price: 29,
		description: "For growing teams and production workloads",
	},
	{
		name: "Business",
		credits: 6000,
		price: 55,
		description: "For high-demand infrastructure and priority support",
	},
];

const currencyOptions = listSupportedCurrencies();

const paymentStatusStyles = {
	processing: "bg-amber-500/10 text-amber-300 border-amber-500/20",
	completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
	failed: "bg-red-500/10 text-red-300 border-red-500/20",
	manual_review: "bg-purple-500/10 text-purple-300 border-purple-500/20",
};

function formatMissingField(field) {
	return field
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (value) => value.toUpperCase());
}

function safeEstimateCredits(amount, currency) {
	try {
		const minor = amountMajorToMinor(String(amount), currency);
		return creditsFromMinorAmount(minor, currency);
	} catch {
		return 0;
	}
}

export default function Billing() {
	const { user } = useAuth();
	const { balance, transactions, currentPlan, refreshTransactions } =
		useDashboard();
	const [searchParams, setSearchParams] = useSearchParams();

	const [showTopUp, setShowTopUp] = useState(false);
	const [showChangePlan, setShowChangePlan] = useState(false);
	const [selectedCurrency, setSelectedCurrency] = useState("EUR");
	const [topUpAmount, setTopUpAmount] = useState(10);
	const [customerProfile, setCustomerProfile] = useState(emptyCustomerProfile);
	const [profileLoading, setProfileLoading] = useState(true);
	const [profileMessage, setProfileMessage] = useState("");
	const [paymentError, setPaymentError] = useState("");
	const [paymentStatus, setPaymentStatus] = useState(null);
	const [checkoutUrl, setCheckoutUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

	const activeInvoice = searchParams.get("invoice") || "";
	const selectedCurrencyConfig = useMemo(
		() => getCurrencyConfig(selectedCurrency),
		[selectedCurrency],
	);
	const estimatedCredits = safeEstimateCredits(
		Number(topUpAmount).toFixed(2),
		selectedCurrency,
	);
	const missingFields = getMissingCustomerFields({
		...customerProfile,
		email: customerProfile.email || user?.email || "",
	});

	useEffect(() => {
		let isMounted = true;

		async function hydrateProfile() {
			if (!user) {
				setProfileLoading(false);
				return;
			}

			setProfileLoading(true);
			try {
				const { profile } = await loadProfile(user);
				if (!isMounted) {
					return;
				}

				setCustomerProfile(profile);
				setProfileMessage("");
			} catch (error) {
				if (!isMounted) {
					return;
				}

				setProfileMessage(
					error instanceof Error
						? error.message
						: "Unable to load your billing profile.",
				);
			} finally {
				if (isMounted) {
					setProfileLoading(false);
				}
			}
		}

		hydrateProfile();

		return () => {
			isMounted = false;
		};
	}, [user]);

	useEffect(() => {
		if (!activeInvoice) {
			return;
		}

		let cancelled = false;
		let pollCount = 0;
		let intervalId;

		const pollInvoice = async () => {
			pollCount += 1;
			setIsRefreshingStatus(true);

			try {
				const nextStatus = await refreshPaymentStatus({
					invoice: activeInvoice,
				});

				if (cancelled) {
					return;
				}

				setPaymentStatus(nextStatus);
				setPaymentError("");

				if (nextStatus.creditsApplied || nextStatus.balanceDelta > 0) {
					refreshTransactions();
				}

				if (nextStatus.status !== "processing" || pollCount >= 12) {
					window.clearInterval(intervalId);
				}
			} catch (error) {
				if (!cancelled) {
					setPaymentError(
						error instanceof Error
							? error.message
							: "Unable to refresh payment status.",
					);
				}
			} finally {
				if (!cancelled) {
					setIsRefreshingStatus(false);
				}
			}
		};

		pollInvoice();
		intervalId = window.setInterval(pollInvoice, 5000);

		return () => {
			cancelled = true;
			window.clearInterval(intervalId);
		};
	}, [activeInvoice, refreshTransactions]);

	const updateSearchInvoice = (invoice) => {
		const next = new URLSearchParams(searchParams);

		if (invoice) {
			next.set("invoice", invoice);
		} else {
			next.delete("invoice");
		}

		setSearchParams(next);
	};

	const handleCustomerFieldChange = (field, value) => {
		setCustomerProfile((current) => ({
			...current,
			[field]: value,
		}));
	};

	const handleTopUp = async () => {
		if (!user) {
			return;
		}

		setIsSubmitting(true);
		setPaymentError("");
		setProfileMessage("");

		try {
			const normalizedProfile = normalizeCustomerProfile({
				...customerProfile,
				email: customerProfile.email || user.email || "",
			});
			const incompleteFields = getMissingCustomerFields(normalizedProfile);

			if (incompleteFields.length > 0) {
				throw new Error(
					`Please complete the required billing fields: ${incompleteFields
						.map(formatMissingField)
						.join(", ")}.`,
				);
			}

			const { profile } = await saveProfile(user, normalizedProfile);
			setCustomerProfile(profile);

			const session = await createPaymentSession({
				amount: Number(topUpAmount).toFixed(2),
				currency: selectedCurrency,
				customer: profile,
			});

			setCheckoutUrl(session.checkoutUrl);
			setPaymentStatus({
				invoice: session.invoice,
				status: "processing",
				providerStatusId: null,
				providerStatusText:
					"Checkout created. Complete the payment to add credits.",
				creditsApplied: false,
				balanceDelta: 0,
			});
			updateSearchInvoice(session.invoice);
			setShowTopUp(false);

			window.location.href = session.checkoutUrl;

		} catch (error) {
			setPaymentError(
				error instanceof Error
					? error.message
					: "Unable to start checkout right now.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const currentPaymentStatus = paymentStatus?.status || "processing";

	return (
		<div className="max-w-5xl mx-auto">
			<h1 className="text-3xl font-bold mb-8">Billing & Payments</h1>

			{(activeInvoice || paymentError) && (
				<div
					className={`mb-8 rounded-2xl border p-5 ${
						paymentStatusStyles[currentPaymentStatus] ||
						"bg-white/5 text-slate-200 border-white/10"
					}`}
				>
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div className="space-y-1">
							<p className="text-xs uppercase tracking-[0.25em] opacity-80">
								SafePay Checkout
							</p>
							<p className="text-lg font-bold">
								{currentPaymentStatus === "completed"
									? "Payment completed"
									: currentPaymentStatus === "failed"
										? "Payment failed"
										: currentPaymentStatus === "manual_review"
											? "Payment needs manual review"
											: "Payment is still processing"}
							</p>
							{activeInvoice && (
								<p className="text-sm opacity-80">Invoice: {activeInvoice}</p>
							)}
							{paymentStatus?.providerStatusText && (
								<p className="text-sm opacity-80">
									{paymentStatus.providerStatusText}
								</p>
							)}
							{paymentError && (
								<p className="text-sm text-red-200">{paymentError}</p>
							)}
						</div>

						<div className="flex flex-wrap gap-3">
							{checkoutUrl && currentPaymentStatus === "processing" && (
								<a
									href={checkoutUrl}
									className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-medium transition-colors"
								>
									Open Secure Checkout
								</a>
							)}
							{activeInvoice && (
								<button
									type="button"
									onClick={() =>
										refreshPaymentStatus({ invoice: activeInvoice })
											.then((nextStatus) => {
												setPaymentStatus(nextStatus);
												if (
													nextStatus.creditsApplied ||
													nextStatus.balanceDelta > 0
												) {
													refreshTransactions();
												}
											})
											.catch((error) => {
												setPaymentError(
													error instanceof Error
														? error.message
														: "Unable to refresh payment status.",
												);
											})
									}
									disabled={isRefreshingStatus}
									className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 text-white text-sm font-medium transition-colors"
								>
									{isRefreshingStatus ? "Checking..." : "Refresh Status"}
								</button>
							)}
							{activeInvoice && currentPaymentStatus !== "processing" && (
								<button
									type="button"
									onClick={() => {
										updateSearchInvoice("");
										setCheckoutUrl("");
										setPaymentStatus(null);
										setPaymentError("");
									}}
									className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
								>
									Dismiss
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			<div className="grid md:grid-cols-2 gap-8 mb-12">
				<div className="bg-[#0f1629] border border-white/5 rounded-2xl p-8">
					<h3 className="text-slate-400 text-sm font-medium mb-2">
						Account Balance
					</h3>
					<div className="text-4xl font-bold text-white mb-2">
						{Math.floor(balance)}{" "}
						<span className="text-2xl text-cyan-400">credits</span>
					</div>
					<p className="text-slate-500 text-xs mb-6">
						Top-ups are processed through a hosted SafePay checkout.
					</p>
					<button
						type="button"
						onClick={() => setShowTopUp(true)}
						className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25"
					>
						Top Up Credits
					</button>
				</div>

				<div className="bg-[#0f1629] border border-white/5 rounded-2xl p-8">
					<h3 className="text-slate-400 text-sm font-medium mb-2">
						Active Plan
					</h3>
					<div className="text-2xl font-bold text-white mb-1">
						{currentPlan.name}
					</div>
					<p className="text-slate-400 text-sm mb-3">
						{currentPlan.credits.toLocaleString()} credits / month
					</p>
					<p className="text-slate-500 text-xs mb-6">
						Plan billing is not connected to live checkout yet. Only credit
						top-ups use the real gateway in this release.
					</p>
					<button
						type="button"
						onClick={() => setShowChangePlan(true)}
						className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
					>
						View Plan Options &rarr;
					</button>
				</div>
			</div>

			<div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6 mb-12">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-xl font-bold">Billing Profile</h2>
						<p className="text-sm text-slate-400 mt-1">
							SafePay requires your legal name, phone, country, and city before
							we can create a hosted checkout.
						</p>
					</div>
					<Link
						to="/dashboard/settings"
						className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
					>
						Edit in Settings
					</Link>
				</div>

				<div className="mt-6 grid md:grid-cols-3 gap-4 text-sm">
					<div className="rounded-xl bg-white/5 border border-white/5 p-4">
						<p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">
							Name
						</p>
						<p className="font-medium text-white">
							{customerProfile.firstName || customerProfile.lastName
								? `${customerProfile.firstName} ${customerProfile.lastName}`.trim()
								: "Missing"}
						</p>
					</div>
					<div className="rounded-xl bg-white/5 border border-white/5 p-4">
						<p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">
							Phone
						</p>
						<p className="font-medium text-white">
							{customerProfile.phone || "Missing"}
						</p>
					</div>
					<div className="rounded-xl bg-white/5 border border-white/5 p-4">
						<p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">
							Country / City
						</p>
						<p className="font-medium text-white">
							{customerProfile.countryCode && customerProfile.city
								? `${customerProfile.countryCode} / ${customerProfile.city}`
								: "Missing"}
						</p>
					</div>
				</div>

				{profileLoading && (
					<p className="mt-4 text-sm text-slate-400">
						Loading your billing profile...
					</p>
				)}
				{profileMessage && (
					<p className="mt-4 text-sm text-slate-300">{profileMessage}</p>
				)}
				{missingFields.length > 0 && !profileLoading && (
					<p className="mt-4 text-sm text-amber-300">
						Missing checkout fields:{" "}
						{missingFields.map(formatMissingField).join(", ")}.
					</p>
				)}
			</div>

			{showTopUp && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-[#0f1629] border border-white/10 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
					>
						<div className="flex justify-between items-center mb-6">
							<div>
								<h2 className="text-2xl font-bold">Top Up Credits</h2>
								<p className="text-sm text-slate-400 mt-1">
									We create a SafePay hosted checkout and keep this dashboard
									tab open to track the invoice status.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setShowTopUp(false)}
								className="text-slate-400 hover:text-white transition-colors"
							>
								<svg
									aria-hidden="true"
									className="w-6 h-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<div className="grid md:grid-cols-2 gap-6">
							<div className="space-y-6">
								<div>
									<p className="text-sm text-slate-400 mb-2 block">
										Select Currency
									</p>
									<div className="grid grid-cols-2 gap-3">
										{currencyOptions.map((currency) => (
											<button
												type="button"
												key={currency.code}
												onClick={() => setSelectedCurrency(currency.code)}
												className={`py-3 rounded-xl font-bold transition-all ${
													selectedCurrency === currency.code
														? "bg-cyan-600 text-white"
														: "bg-white/5 text-slate-400 hover:bg-white/10"
												}`}
											>
												{currency.symbol} {currency.code}
											</button>
										))}
									</div>
								</div>

								<div>
									<p className="text-sm text-slate-400 mb-2 block">
										Quick Select
									</p>
									<div className="grid grid-cols-5 gap-2">
										{[5, 10, 25, 50, 100].map((amount) => (
											<button
												type="button"
												key={amount}
												onClick={() => setTopUpAmount(amount)}
												className={`py-2 rounded-lg text-sm font-bold transition-all ${
													topUpAmount === amount
														? "bg-cyan-600 text-white"
														: "bg-white/5 text-slate-400 hover:bg-white/10"
												}`}
											>
												{amount}
											</button>
										))}
									</div>
								</div>

								<div>
									<label
										htmlFor="topup-range"
										className="text-sm text-slate-400 mb-2 block"
									>
										Custom Amount
									</label>
									<input
										id="topup-range"
										type="range"
										min="0.01"
										max="200"
										step="0.01"
										value={topUpAmount}
										onChange={(event) =>
											setTopUpAmount(
												Math.round(
													Number.parseFloat(event.target.value) * 100,
												) / 100,
											)
										}
										className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
									/>
									<div className="flex justify-between text-xs text-slate-500 mt-2">
										<span>
											{selectedCurrencyConfig.symbol}
											0.01
										</span>
										<span>
											{selectedCurrencyConfig.symbol}
											200.00
										</span>
									</div>
								</div>

								<div>
									<label
										htmlFor="topup-amount"
										className="text-sm text-slate-400 mb-2 block"
									>
										Or Enter Exact Amount
									</label>
									<div className="relative">
										<span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
											{selectedCurrencyConfig.symbol}
										</span>
										<input
											id="topup-amount"
											type="number"
											min="0.01"
											max="200"
											step="0.01"
											value={topUpAmount}
											onChange={(event) =>
												setTopUpAmount(
													Math.min(
														Math.max(
															Number.parseFloat(event.target.value) || 0.01,
															0.01,
														),
														200,
													),
												)
											}
											className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors"
										/>
									</div>
								</div>

								<div className="bg-white/5 rounded-xl p-6">
									<div className="flex justify-between items-center mb-3">
										<span className="text-slate-400">Amount</span>
										<span className="text-2xl font-bold">
											{formatMinorAmount(
												amountMajorToMinor(
													Number(topUpAmount).toFixed(2),
													selectedCurrency,
												),
												selectedCurrency,
											)}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-slate-400">Credits</span>
										<span className="text-2xl font-bold text-cyan-400">
											{estimatedCredits}
										</span>
									</div>
									<div className="text-xs text-slate-500 mt-3 text-center">
										Live checkout estimate only. Credits are applied after
										SafePay confirms the invoice.
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="billing-first-name"
											className="block text-sm text-slate-400 mb-2"
										>
											First Name
										</label>
										<input
											id="billing-first-name"
											type="text"
											value={customerProfile.firstName}
											onChange={(event) =>
												handleCustomerFieldChange(
													"firstName",
													event.target.value,
												)
											}
											className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
										/>
									</div>
									<div>
										<label
											htmlFor="billing-last-name"
											className="block text-sm text-slate-400 mb-2"
										>
											Last Name
										</label>
										<input
											id="billing-last-name"
											type="text"
											value={customerProfile.lastName}
											onChange={(event) =>
												handleCustomerFieldChange(
													"lastName",
													event.target.value,
												)
											}
											className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
										/>
									</div>
								</div>

								<div>
									<label
										htmlFor="billing-email"
										className="block text-sm text-slate-400 mb-2"
									>
										Email
									</label>
									<input
										id="billing-email"
										type="email"
										readOnly
										value={customerProfile.email || user?.email || ""}
										className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 cursor-not-allowed"
									/>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="billing-phone"
											className="block text-sm text-slate-400 mb-2"
										>
											Phone
										</label>
										<input
											id="billing-phone"
											type="text"
											value={customerProfile.phone}
											onChange={(event) =>
												handleCustomerFieldChange("phone", event.target.value)
											}
											className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
										/>
									</div>
									<div>
										<label
											htmlFor="billing-country"
											className="block text-sm text-slate-400 mb-2"
										>
											Country
										</label>
										<CountrySelect
											id="billing-country"
											value={customerProfile.countryCode}
											onChange={(code) => handleCustomerFieldChange("countryCode", code)}
											className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
										/>
									</div>
								</div>

								<div>
									<label
										htmlFor="billing-city"
										className="block text-sm text-slate-400 mb-2"
									>
										City
									</label>
									<input
										id="billing-city"
										type="text"
										value={customerProfile.city}
										onChange={(event) =>
											handleCustomerFieldChange("city", event.target.value)
										}
										className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500"
									/>
								</div>

								<div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
									Missing required fields:{" "}
									{missingFields.length > 0
										? missingFields.map(formatMissingField).join(", ")
										: "None"}
								</div>

								<button
									type="button"
									onClick={handleTopUp}
									disabled={isSubmitting || profileLoading}
									className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25"
								>
									{isSubmitting
										? "Creating Secure Checkout..."
										: "Open SafePay Checkout"}
								</button>
							</div>
						</div>
					</motion.div>
				</div>
			)}

			{showChangePlan && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						className="bg-[#0f1629] border border-white/10 rounded-2xl p-8 max-w-2xl w-full"
					>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-2xl font-bold">Plan Options</h2>
							<button
								type="button"
								onClick={() => setShowChangePlan(false)}
								className="text-slate-400 hover:text-white transition-colors"
							>
								<svg
									aria-hidden="true"
									className="w-6 h-6"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
							Recurring plan billing is intentionally out of scope for this
							release. These cards are informational until subscription checkout
							is integrated.
						</div>

						<div className="grid sm:grid-cols-3 gap-4">
							{planTiers.map((plan) => {
								const isCurrent = currentPlan.name === plan.name;
								return (
									<div
										key={plan.name}
										className={`relative rounded-xl p-6 border transition-all ${
											isCurrent
												? "border-cyan-500/50 bg-cyan-500/10"
												: "border-white/10 bg-white/5"
										}`}
									>
										{isCurrent && (
											<span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-cyan-500 text-black text-xs font-bold rounded-full">
												Current
											</span>
										)}
										<h3 className="text-lg font-bold mb-1">{plan.name}</h3>
										<p className="text-xs text-slate-500 mb-4">
											{plan.description}
										</p>
										<div className="text-3xl font-black mb-1">
											€{plan.price}
											<span className="text-sm font-normal text-slate-500">
												/mo
											</span>
										</div>
										<p className="text-sm text-cyan-400 mb-5">
											{plan.credits.toLocaleString()} credits
										</p>
										<div className="w-full py-2.5 rounded-xl font-bold text-sm text-center bg-white/5 text-slate-400">
											{isCurrent ? "Active" : "Coming Soon"}
										</div>
									</div>
								);
							})}
						</div>
					</motion.div>
				</div>
			)}

			<div className="bg-[#0f1629] border border-white/5 rounded-2xl overflow-hidden">
				<div className="p-6 border-b border-white/5">
					<h2 className="text-xl font-bold">Transaction History</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-white/5 text-slate-400">
							<tr>
								<th className="p-4 font-medium pl-6">Date</th>
								<th className="p-4 font-medium">Description</th>
								<th className="p-4 font-medium">Amount</th>
								<th className="p-4 font-medium">Currency Paid</th>
								<th className="p-4 font-medium text-right pr-6">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{transactions.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="p-8 text-center text-slate-500 text-sm"
									>
										No transactions yet. Your completed SafePay top-ups will
										appear here.
									</td>
								</tr>
							) : (
								transactions.map((tx) => (
									<tr
										key={tx.id}
										className="hover:bg-white/5 transition-colors"
									>
										<td className="p-4 pl-6 text-slate-400">{tx.date}</td>
										<td className="p-4 font-medium text-white">
											{tx.description}
										</td>
										<td
											className={`p-4 font-medium ${
												tx.amount > 0 ? "text-green-400" : "text-white"
											}`}
										>
											{tx.amount > 0 ? "+" : ""}
											{Math.floor(tx.amount)} credits
										</td>
										<td className="p-4 text-slate-400">
											{tx.currencyPaid || "-"}
										</td>
										<td className="p-4 text-right pr-6">
											<span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs">
												{tx.status}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			<style jsx>{`
				.slider-thumb::-webkit-slider-thumb {
					appearance: none;
					width: 20px;
					height: 20px;
					background: #06b6d4;
					cursor: pointer;
					border-radius: 50%;
					box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
				}
				.slider-thumb::-moz-range-thumb {
					width: 20px;
					height: 20px;
					background: #06b6d4;
					cursor: pointer;
					border-radius: 50%;
					border: none;
					box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
				}
			`}</style>
		</div>
	);
}
