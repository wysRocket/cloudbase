import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";

// ─── Chart helpers ────────────────────────────────────────────────────────────

function buildSparkPoints(values, width = 520, height = 140) {
	if (!values.length) return "";
	const max = Math.max(...values, 1);
	const stepX = values.length > 1 ? width / (values.length - 1) : width;
	return values
		.map((v, i) => `${i * stepX},${height - (v / max) * (height - 8)}`)
		.join(" ");
}

// ─── SVG Donut Ring ───────────────────────────────────────────────────────────

const DONUT_R = 40;
const DONUT_CIRC = 2 * Math.PI * DONUT_R;

function DonutRing({ inflow, outflow }) {
	const total = Math.max(inflow + outflow, 1);
	const inDash = (inflow / total) * DONUT_CIRC;
	const outDash = (outflow / total) * DONUT_CIRC;
	return (
		<svg viewBox="0 0 120 120" className="w-full h-full">
			<circle
				cx="60"
				cy="60"
				r={DONUT_R}
				fill="none"
				stroke="rgba(255,255,255,0.06)"
				strokeWidth="14"
			/>
			<circle
				cx="60"
				cy="60"
				r={DONUT_R}
				fill="none"
				stroke="#f59e0b"
				strokeWidth="14"
				strokeDasharray={`${outDash} ${DONUT_CIRC}`}
				strokeDashoffset={-inDash}
				transform="rotate(-90 60 60)"
				strokeLinecap="butt"
			/>
			<circle
				cx="60"
				cy="60"
				r={DONUT_R}
				fill="none"
				stroke="#10b981"
				strokeWidth="14"
				strokeDasharray={`${inDash} ${DONUT_CIRC}`}
				strokeDashoffset={0}
				transform="rotate(-90 60 60)"
				strokeLinecap="butt"
			/>
		</svg>
	);
}

// ─── User Acquisition Bar Chart ───────────────────────────────────────────────

function AcquisitionChart({ data }) {
	if (!data.length) return <div className="h-28 bg-white/5 rounded-xl" />;
	const max = Math.max(...data.map((d) => d.count), 1);
	const barW = 18;
	const gap = 4;
	const w = data.length * (barW + gap) - gap;
	const h = 90;
	return (
		<svg viewBox={`0 0 ${w} ${h + 16}`} className="w-full h-28">
			<defs>
				<linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#14b8a6" stopOpacity="0.9" />
					<stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
				</linearGradient>
			</defs>
			{data.map((d, i) => {
				const barH = Math.max((d.count / max) * h, d.count > 0 ? 3 : 1);
				const x = i * (barW + gap);
				return (
					<g key={d.month}>
						<rect
							x={x}
							y={h - barH}
							width={barW}
							height={barH}
							rx="3"
							fill={d.count > 0 ? "url(#barGrad)" : "rgba(255,255,255,0.05)"}
						/>
						<text
							x={x + barW / 2}
							y={h + 12}
							textAnchor="middle"
							fontSize="8"
							fill="rgba(255,255,255,0.3)"
						>
							{d.month.slice(5)}
						</text>
					</g>
				);
			})}
		</svg>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminObservability() {
	const { isAdmin, adminLoading } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [profiles, setProfiles] = useState([]);
	const [roles, setRoles] = useState([]);
	const [transactions, setTransactions] = useState([]);

	const [serviceFlags, setServiceFlags] = useState([]);
	const [reconciliationRows, setReconciliationRows] = useState([]);

	// Filter / pagination state
	const [dateRange, setDateRange] = useState("all");
	const [txSearch, setTxSearch] = useState("");
	const [txTypeFilter, setTxTypeFilter] = useState("all");
	const [txPage, setTxPage] = useState(0);
	const TX_PAGE_SIZE = 10;

	// ─── Data load ──────────────────────────────────────────────────────────────

	const loadBackofficeData = useCallback(async () => {
		if (adminLoading) return;
		if (!isAdmin) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError("");
		const [profilesRes, rolesRes, txRes, flagsRes, reconRes] = await Promise.all([
			supabase
				.from("profiles")
				.select("id, email, created_at")
				.order("created_at", { ascending: false }),
			supabase
				.from("user_roles")
				.select("user_id, role, created_at")
				.order("created_at", { ascending: false }),
			supabase
				.from("credit_transactions")
				.select("id, user_id, description, amount, type, status, created_at")
				.order("created_at", { ascending: false })
				.limit(300),
			supabase
			.from("service_feature_flags")
			.select("id, service_type, region, enabled, rollout_percent, updated_at")
			.order("service_type", { ascending: true })
			.limit(200),
		supabase
			.from("provisioning_reconciliation_runs")
			.select("id, run_at, paid_but_not_provisioned_count, provisioned_without_payment_count, retry_hotspot_count, notes")
			.order("run_at", { ascending: false })
			.limit(30),
		]);
		if (profilesRes.error || rolesRes.error || txRes.error) {
			setError(
				profilesRes.error?.message ||
					rolesRes.error?.message ||
					txRes.error?.message ||
					"Unable to load backoffice observability data.",
			);
			setLoading(false);
			return;
		}
		setProfiles(profilesRes.data || []);
		setRoles(rolesRes.data || []);
		setTransactions(txRes.data || []);
		setServiceFlags(flagsRes.error ? [] : flagsRes.data || []);
		setReconciliationRows(reconRes.error ? [] : reconRes.data || []);
		setLoading(false);
	}, [isAdmin, adminLoading]);

	useEffect(() => {
		loadBackofficeData();
	}, [loadBackofficeData]);

	// ─── Role map ────────────────────────────────────────────────────────────────

	const roleMap = useMemo(() => {
		const map = new Map();
		roles.forEach((r) => {
			if (!map.has(r.user_id)) map.set(r.user_id, new Set());
			map.get(r.user_id).add(r.role);
		});
		return map;
	}, [roles]);

	// ─── Date range cutoff ───────────────────────────────────────────────────────

	const dateCutoff = useMemo(() => {
		if (dateRange === "all") return null;
		const d = new Date();
		if (dateRange === "24h") d.setHours(d.getHours() - 24);
		else if (dateRange === "7d") d.setDate(d.getDate() - 7);
		else if (dateRange === "30d") d.setDate(d.getDate() - 30);
		else if (dateRange === "90d") d.setDate(d.getDate() - 90);
		return d.toISOString();
	}, [dateRange]);

	const rangeTransactions = useMemo(
		() =>
			!dateCutoff
				? transactions
				: transactions.filter((tx) => (tx.created_at || "") >= dateCutoff),
		[transactions, dateCutoff],
	);

	// ─── KPIs ────────────────────────────────────────────────────────────────────

	const currentMonth = new Date().toISOString().slice(0, 7);
	const totalUsers = profiles.length;
	const adminUsers = roles.filter((r) => r.role === "admin").length;

	const creditsIn = rangeTransactions
		.filter((tx) => tx.type === "credit")
		.reduce((sum, tx) => sum + Math.max(tx.amount, 0), 0);
	const creditsOut = rangeTransactions
		.filter((tx) => tx.type === "debit")
		.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
	const netCredits = creditsIn - creditsOut;

	const monthlyBurn = transactions
		.filter(
			(tx) =>
				tx.type === "debit" && (tx.created_at || "").startsWith(currentMonth),
		)
		.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

	const suspiciousEvents = transactions.filter(
		(tx) => (tx.status || "Completed") !== "Completed",
	).length;

	// ─── Cashflow series (6 months) ──────────────────────────────────────────────

	const cashflowSeries = useMemo(() => {
		const months = Array.from({ length: 6 }, (_, i) => {
			const d = new Date();
			d.setMonth(d.getMonth() - (5 - i));
			return d.toISOString().slice(0, 7);
		});
		return months.map((month) => {
			const inTotal = transactions
				.filter(
					(tx) =>
						tx.type === "credit" && (tx.created_at || "").startsWith(month),
				)
				.reduce((sum, tx) => sum + Math.max(tx.amount, 0), 0);
			const outTotal = transactions
				.filter(
					(tx) =>
						tx.type === "debit" && (tx.created_at || "").startsWith(month),
				)
				.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
			return { month, inTotal, outTotal, net: inTotal - outTotal };
		});
	}, [transactions]);

	const inflowPoints = buildSparkPoints(cashflowSeries.map((p) => p.inTotal));
	const outflowPoints = buildSparkPoints(cashflowSeries.map((p) => p.outTotal));

	// ─── User acquisition (12 months) ────────────────────────────────────────────

	const userCohorts = useMemo(() => {
		const months = Array.from({ length: 12 }, (_, i) => {
			const d = new Date();
			d.setMonth(d.getMonth() - (11 - i));
			return d.toISOString().slice(0, 7);
		});
		return months.map((month) => ({
			month,
			count: profiles.filter((p) => (p.created_at || "").startsWith(month))
				.length,
		}));
	}, [profiles]);

	// ─── Top spenders ────────────────────────────────────────────────────────────

	const topSpenders = useMemo(() => {
		const map = new Map();
		rangeTransactions
			.filter((tx) => tx.type === "debit")
			.forEach((tx) =>
				map.set(tx.user_id, (map.get(tx.user_id) || 0) + Math.abs(tx.amount)),
			);
		return Array.from(map.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5)
			.map(([userId, total]) => ({
				userId,
				total,
				email:
					profiles.find((p) => p.id === userId)?.email ||
					`${userId.slice(0, 8)}…`,
			}));
	}, [rangeTransactions, profiles]);

	// ─── Transaction filtering + pagination ──────────────────────────────────────

	const filteredTx = useMemo(() => {
		const q = txSearch.toLowerCase();
		return rangeTransactions.filter((tx) => {
			const matchesType = txTypeFilter === "all" || tx.type === txTypeFilter;
			const matchesSearch =
				!q ||
				(tx.description || "").toLowerCase().includes(q) ||
				(tx.user_id || "").toLowerCase().includes(q);
			return matchesType && matchesSearch;
		});
	}, [rangeTransactions, txTypeFilter, txSearch]);

	useEffect(() => {
		setTxPage(0);
	}, [txSearch, txTypeFilter, dateRange]);

	const txPageCount = Math.ceil(filteredTx.length / TX_PAGE_SIZE);
	const paginatedTx = filteredTx.slice(
		txPage * TX_PAGE_SIZE,
		(txPage + 1) * TX_PAGE_SIZE,
	);

	const recentUsers = profiles.slice(0, 8);

	// Queue/job health metrics are not available from credit_transactions.
	// These will be wired to provision_jobs table data when that query is added.
	const queueBacklog = 0;
	const deadLetterCount = 0;
	const providerFailures = 0;
	const paymentProvisionMismatch = reconciliationRows
		.reduce((sum, row) => sum + (row.paid_but_not_provisioned_count || 0) + (row.provisioned_without_payment_count || 0), 0);

	const alertCards = [
		{
			id: "dead-letter",
			label: "Dead-letter growth",
			value: deadLetterCount,
			state: deadLetterCount > 10 ? "Critical" : deadLetterCount > 0 ? "Watch" : "Healthy",
		},
		{
			id: "provider-failures",
			label: "Provider API failure spikes",
			value: providerFailures,
			state: providerFailures > 8 ? "Critical" : providerFailures > 0 ? "Watch" : "Healthy",
		},
		{
			id: "mismatch",
			label: "Payment/provision mismatch",
			value: paymentProvisionMismatch,
			state: paymentProvisionMismatch > 0 ? "Critical" : "Healthy",
		},
	];

	// ─── Guards ──────────────────────────────────────────────────────────────────

	if (adminLoading || loading) {
		return (
			<div className="min-h-[60vh] flex items-center justify-center">
				<div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div className="max-w-2xl mx-auto mt-10 bg-[#0f1629] border border-red-500/20 rounded-2xl p-8">
				<h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
				<p className="text-slate-400 mb-6">
					Only admin users can access the backoffice observability dashboard.
				</p>
				<Link
					to="/dashboard"
					className="text-cyan-400 hover:text-cyan-300 font-medium"
				>
					Return to Overview
				</Link>
			</div>
		);
	}

	const DATE_RANGES = [
		{ value: "24h", label: "24h" },
		{ value: "7d", label: "7d" },
		{ value: "30d", label: "30d" },
		{ value: "90d", label: "90d" },
		{ value: "all", label: "All" },
	];

	// ─── Render ───────────────────────────────────────────────────────────────────

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#0b1220] p-6 md:p-8">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.25em] text-cyan-300/70 mb-2">
							Backoffice / Observability
						</p>
						<h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
							FinOps Command Center
						</h1>
						<p className="text-slate-400 mt-2 max-w-2xl text-sm md:text-base">
							Unified signal for users, role posture, and credit cashflow
							health.
						</p>
					</div>
					<div className="flex flex-wrap gap-2 items-center">
						{/* Date range selector */}
						<div className="flex rounded-lg overflow-hidden border border-white/10">
							{DATE_RANGES.map((r) => (
								<button
									key={r.value}
									type="button"
									onClick={() => setDateRange(r.value)}
									className={`px-3 py-1.5 text-xs font-medium transition-colors ${
										dateRange === r.value
											? "bg-cyan-600 text-white"
											: "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
									}`}
								>
									{r.label}
								</button>
							))}
						</div>
						<Link
							to="/dashboard"
							className="px-3 py-2 text-sm rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
						>
							User View
						</Link>
						<button
							type="button"
							onClick={loadBackofficeData}
							className="px-3 py-2 text-sm rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
						>
							Refresh
						</button>
					</div>
				</div>
			</div>

			{error && (
				<div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
					{error}
				</div>
			)}

			{/* KPI Strip */}
			<div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
				{[
					{
						label: "Total Users",
						value: totalUsers,
						sub: `${adminUsers} admins`,
						tone: "text-white",
					},
					{
						label: "Credits Inflow",
						value: creditsIn,
						sub: dateRange === "all" ? "All time" : `Last ${dateRange}`,
						tone: "text-emerald-300",
					},
					{
						label: "Credits Outflow",
						value: creditsOut,
						sub: `${monthlyBurn.toLocaleString()} this month`,
						tone: "text-amber-300",
					},
					{
						label: "Net Position",
						value: netCredits,
						sub: netCredits >= 0 ? "Positive balance" : "Deficit",
						tone: netCredits >= 0 ? "text-emerald-300" : "text-red-400",
					},
					{
						label: "Risk Flags",
						value: suspiciousEvents,
						sub: "Non-completed tx",
						tone: suspiciousEvents > 0 ? "text-red-400" : "text-slate-400",
					},
				].map((card, i) => (
					<motion.div
						key={card.label}
						initial={{ opacity: 0, y: 14 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: i * 0.05 }}
						className="rounded-2xl border border-white/10 bg-[#0d1527] p-4"
					>
						<p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1">
							{card.label}
						</p>
						<p className={`text-2xl font-bold ${card.tone}`}>
							{Number(card.value).toLocaleString()}
						</p>
						<p className="text-[11px] text-slate-600 mt-1">{card.sub}</p>
					</motion.div>
				))}
			</div>

			{/* Cashflow chart + Credit donut */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				{/* Dual sparklines */}
				<div className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#0d1527] p-5">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="font-bold text-lg">Cashflow Signal (6 months)</h2>
							<p className="text-xs text-slate-500">
								Inflow vs outflow credit trend
							</p>
						</div>
						<div className="flex gap-4 text-xs text-slate-400">
							<span className="flex items-center gap-1.5">
								<span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" />
								Inflow
							</span>
							<span className="flex items-center gap-1.5">
								<span className="w-3 h-0.5 bg-amber-400 inline-block rounded" />
								Outflow
							</span>
						</div>
					</div>
					<div className="h-40 rounded-xl bg-[#0b1220] border border-white/5 p-3">
						<svg viewBox="0 0 520 140" className="w-full h-full">
							<defs>
								<linearGradient id="inflowGrad" x1="0" y1="0" x2="1" y2="0">
									<stop offset="0%" stopColor="#10b981" />
									<stop offset="100%" stopColor="#34d399" />
								</linearGradient>
								<linearGradient id="outflowGrad" x1="0" y1="0" x2="1" y2="0">
									<stop offset="0%" stopColor="#f59e0b" />
									<stop offset="100%" stopColor="#fbbf24" />
								</linearGradient>
							</defs>
							<polyline
								fill="none"
								stroke="url(#outflowGrad)"
								strokeWidth="2"
								strokeDasharray="4 2"
								points={outflowPoints}
							/>
							<polyline
								fill="none"
								stroke="url(#inflowGrad)"
								strokeWidth="3"
								points={inflowPoints}
							/>
						</svg>
					</div>
					<div className="grid grid-cols-6 gap-1 mt-3">
						{cashflowSeries.map((pt) => (
							<div
								key={pt.month}
								className="rounded-lg bg-white/5 p-2 text-center border border-white/5"
							>
								<p className="text-[10px] text-slate-500">
									{pt.month.slice(5)}
								</p>
								<p
									className={`text-xs font-semibold ${
										pt.net >= 0 ? "text-emerald-300" : "text-red-400"
									}`}
								>
									{pt.net >= 0 ? "+" : "-"}
									{Math.abs(pt.net).toLocaleString()}
								</p>
							</div>
						))}
					</div>
				</div>

				{/* Credit distribution donut */}
				<div className="rounded-2xl border border-white/10 bg-[#0d1527] p-5">
					<h2 className="font-bold text-lg mb-1">Credit Distribution</h2>
					<p className="text-xs text-slate-500 mb-4">
						Inflow vs outflow breakdown
					</p>
					<div className="flex items-center gap-4">
						<div className="w-28 h-28 shrink-0 relative">
							<DonutRing inflow={creditsIn} outflow={creditsOut} />
							<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
								<div className="text-center">
									<p className="text-[10px] text-slate-500 leading-none">Net</p>
									<p
										className={`text-sm font-bold leading-tight ${
											netCredits >= 0 ? "text-emerald-300" : "text-red-400"
										}`}
									>
										{netCredits >= 0 ? "+" : ""}
										{netCredits.toLocaleString()}
									</p>
								</div>
							</div>
						</div>
						<div className="space-y-3 flex-1 min-w-0">
							<div>
								<div className="flex justify-between text-xs mb-1">
									<span className="flex items-center gap-1 text-emerald-300">
										<span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
										Inflow
									</span>
									<span className="text-slate-300">
										{creditsIn.toLocaleString()}
									</span>
								</div>
								<div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
									<div
										className="h-full bg-emerald-500 rounded-full"
										style={{
											width: `${
												creditsIn + creditsOut > 0
													? (creditsIn / (creditsIn + creditsOut)) * 100
													: 0
											}%`,
										}}
									/>
								</div>
							</div>
							<div>
								<div className="flex justify-between text-xs mb-1">
									<span className="flex items-center gap-1 text-amber-300">
										<span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
										Outflow
									</span>
									<span className="text-slate-300">
										{creditsOut.toLocaleString()}
									</span>
								</div>
								<div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
									<div
										className="h-full bg-amber-500 rounded-full"
										style={{
											width: `${
												creditsIn + creditsOut > 0
													? (creditsOut / (creditsIn + creditsOut)) * 100
													: 0
											}%`,
										}}
									/>
								</div>
							</div>
							<div className="pt-2 border-t border-white/5">
								<p className="text-[11px] text-slate-500">Monthly Burn</p>
								<p className="text-amber-300 font-semibold text-sm">
									{monthlyBurn.toLocaleString()} credits
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* User Acquisition + Top Spenders */}
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
				{/* Acquisition bar chart */}
				<div className="rounded-2xl border border-white/10 bg-[#0d1527] p-5">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="font-bold text-lg">User Acquisition</h2>
							<p className="text-xs text-slate-500">
								New signups per month (12 months)
							</p>
						</div>
						<div className="text-right">
							<p className="text-2xl font-bold text-white">
								{totalUsers.toLocaleString()}
							</p>
							<p className="text-[11px] text-slate-500">total users</p>
						</div>
					</div>
					<AcquisitionChart data={userCohorts} />
				</div>

				{/* Top spenders */}
				<div className="rounded-2xl border border-white/10 bg-[#0d1527] p-5">
					<div className="mb-4">
						<h2 className="font-bold text-lg">Top Spenders</h2>
						<p className="text-xs text-slate-500 mt-0.5">
							Highest credit consumption
							{dateRange !== "all" ? ` · last ${dateRange}` : ""}
						</p>
					</div>
					{topSpenders.length === 0 ? (
						<p className="text-sm text-slate-500">
							No debit activity in this period.
						</p>
					) : (
						<div className="space-y-3">
							{topSpenders.map((spender, rank) => {
								const maxSpend = topSpenders[0]?.total || 1;
								return (
									<div key={spender.userId} className="flex items-center gap-3">
										<div
											className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
												rank === 0
													? "bg-amber-500/20 text-amber-300"
													: "bg-white/5 text-slate-500"
											}`}
										>
											{rank + 1}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex justify-between text-xs mb-1">
												<span className="text-slate-300 truncate">
													{spender.email}
												</span>
												<span className="text-amber-300 shrink-0 ml-2 font-semibold">
													{spender.total.toLocaleString()}
												</span>
											</div>
											<div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
												<div
													className="h-full bg-amber-500/60 rounded-full transition-all duration-500"
													style={{
														width: `${(spender.total / maxSpend) * 100}%`,
													}}
												/>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* Role Distribution + Recent Users */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				{/* Role distribution */}
				<div className="rounded-2xl border border-white/10 bg-[#0d1527] p-5">
					<h2 className="font-bold text-lg mb-4">Role Distribution</h2>
					<div className="space-y-3">
						{[
							{ name: "Admin", count: adminUsers, tone: "bg-cyan-500" },
							{
								name: "Standard",
								count: Math.max(totalUsers - adminUsers, 0),
								tone: "bg-slate-400",
							},
						].map((row) => {
							const pct = totalUsers ? (row.count / totalUsers) * 100 : 0;
							return (
								<div key={row.name}>
									<div className="flex justify-between text-xs text-slate-400 mb-1">
										<span>{row.name}</span>
										<span>
											{row.count} ({pct.toFixed(0)}%)
										</span>
									</div>
									<div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
										<div
											className={`h-full ${row.tone}`}
											style={{ width: `${pct}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
					<div className="mt-5 p-3 rounded-xl border border-white/10 bg-black/20">
						<p className="text-xs text-slate-500">Risk Flags</p>
						<p className="text-lg font-bold text-white mt-1">
							{suspiciousEvents}
						</p>
						<p className="text-xs text-slate-500">Non-completed transactions</p>
					</div>
				</div>

				{/* Recent users */}
				<div className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#0d1527] overflow-hidden">
					<div className="p-4 border-b border-white/5 flex items-center justify-between">
						<h2 className="font-bold">Recent Users</h2>
						<span className="text-xs text-slate-500">{totalUsers} total</span>
					</div>
					<div className="divide-y divide-white/5">
						{recentUsers.length === 0 && (
							<div className="p-6 text-sm text-slate-500">No users yet.</div>
						)}
						{recentUsers.map((u) => {
							const rolesForUser = Array.from(roleMap.get(u.id) || []);
							const isAdminUser = rolesForUser.includes("admin");
							return (
								<div
									key={u.id}
									className="p-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
								>
									<div
										className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
											isAdminUser
												? "bg-cyan-500/20 text-cyan-300"
												: "bg-white/5 text-slate-400"
										}`}
									>
										{(u.email?.[0] || "?").toUpperCase()}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-white truncate">
											{u.email || "No email"}
										</p>
										<p className="text-xs text-slate-500 font-mono truncate">
											{u.id}
										</p>
									</div>
									<div className="text-right shrink-0">
										<p className="text-xs text-slate-400">
											{u.created_at
												? new Date(u.created_at).toLocaleDateString()
												: "N/A"}
										</p>
										<span
											className={`text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block ${
												isAdminUser
													? "bg-cyan-500/20 text-cyan-300"
													: "bg-white/5 text-slate-500"
											}`}
										>
											{rolesForUser.join(", ") || "user"}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>


			{/* Queue + Failure Metrics */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				<div className="rounded-2xl border border-white/10 bg-[#0d1527] p-5">
					<h2 className="font-bold text-lg">Queue Health</h2>
					<p className="text-xs text-slate-500 mb-4">Backlog and dead-letter trends</p>
					<p className="text-3xl font-bold text-cyan-300">{queueBacklog}</p>
					<p className="text-xs text-slate-500">queued events</p>
					<p className="mt-3 text-lg font-semibold text-red-300">{deadLetterCount}</p>
					<p className="text-xs text-slate-500">dead-lettered events</p>
				</div>
				<div className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#0d1527] p-5">
					<h2 className="font-bold text-lg mb-3">Operational Alerts</h2>
					<div className="grid sm:grid-cols-3 gap-3">
						{alertCards.map((alert) => (
							<div key={alert.id} className="rounded-xl border border-white/10 p-3 bg-black/20">
								<p className="text-xs text-slate-500">{alert.label}</p>
								<p className="text-2xl font-bold text-white mt-1">{alert.value}</p>
								<p className={`text-xs mt-1 ${alert.state === "Critical" ? "text-red-300" : alert.state === "Watch" ? "text-amber-300" : "text-emerald-300"}`}>{alert.state}</p>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Feature Flags + Reconciliation + Runbooks */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				<div className="xl:col-span-2 rounded-2xl border border-white/10 bg-[#0d1527] overflow-hidden">
					<div className="p-4 border-b border-white/5">
						<h2 className="font-bold">Service Rollout Flags</h2>
						<p className="text-xs text-slate-500">Per service type and region phased rollout</p>
					</div>
					<div className="divide-y divide-white/5">
						{serviceFlags.length === 0 ? <p className="p-4 text-sm text-slate-500">No rollout flags found.</p> : serviceFlags.slice(0, 12).map((flag) => (
							<div key={flag.id} className="p-3 grid grid-cols-4 gap-2 text-sm">
								<p className="text-white">{flag.service_type}</p>
								<p className="text-slate-300">{flag.region}</p>
								<p className="text-cyan-300">{flag.rollout_percent || 0}%</p>
								<p className={flag.enabled ? "text-emerald-300" : "text-slate-500"}>{flag.enabled ? "Enabled" : "Disabled"}</p>
							</div>
						))}
					</div>
				</div>
				<div className="rounded-2xl border border-white/10 bg-[#0d1527] p-5">
					<h2 className="font-bold text-lg">Incident Runbooks</h2>
					<ul className="mt-3 space-y-2 text-sm text-slate-300 list-disc list-inside">
						<li>Retry pipeline: replay transient failures with exponential backoff.</li>
						<li>Rollback: disable impacted region flags and halt new provisioning.</li>
						<li>Orphan cleanup: detect paid-but-unprovisioned resources and reconcile.</li>
						<li>Provider outage mode: shift to degraded mode and queue async retries.</li>
					</ul>
				</div>
			</div>

			{/* Financial Events table — search + filter + pagination */}
			<div className="rounded-2xl border border-white/10 bg-[#0d1527] overflow-hidden">
				<div className="p-4 border-b border-white/5">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<div>
							<h2 className="font-bold">Financial Events</h2>
							<p className="text-xs text-slate-500 mt-0.5">
								{filteredTx.length} transactions
								{dateRange !== "all" ? ` · last ${dateRange}` : ""}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{/* Type filter */}
							<div className="flex rounded-lg overflow-hidden border border-white/10">
								{[
									{ value: "all", label: "All" },
									{ value: "credit", label: "Inflow" },
									{ value: "debit", label: "Outflow" },
								].map((f) => (
									<button
										key={f.value}
										type="button"
										onClick={() => setTxTypeFilter(f.value)}
										className={`px-3 py-1.5 text-xs font-medium transition-colors ${
											txTypeFilter === f.value
												? "bg-cyan-600 text-white"
												: "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
										}`}
									>
										{f.label}
									</button>
								))}
							</div>
							{/* Search */}
							<input
								type="text"
								placeholder="Search description or user ID…"
								value={txSearch}
								onChange={(e) => setTxSearch(e.target.value)}
								className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 w-52"
							/>
						</div>
					</div>
				</div>

				{/* Column headers */}
				<div className="hidden sm:grid grid-cols-[1fr_1fr_80px_72px_100px] gap-4 px-4 py-2 text-[11px] uppercase tracking-wider text-slate-600 border-b border-white/5">
					<span>Description</span>
					<span>User</span>
					<span className="text-right">Amount</span>
					<span className="text-center">Type</span>
					<span className="text-right">Date</span>
				</div>

				<div className="divide-y divide-white/5">
					{paginatedTx.length === 0 ? (
						<div className="p-8 text-sm text-slate-500 text-center">
							No matching transactions.
						</div>
					) : (
						paginatedTx.map((tx) => (
							<div
								key={tx.id}
								className="px-4 py-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_72px_100px] gap-1 sm:gap-4 sm:items-center hover:bg-white/[0.02] transition-colors"
							>
								<p className="text-sm text-white truncate">
									{tx.description || "—"}
								</p>
								<p className="text-xs text-slate-500 font-mono truncate">
									{tx.user_id}
								</p>
								<p
									className={`text-sm font-semibold text-right ${
										tx.type === "credit" ? "text-emerald-300" : "text-amber-300"
									}`}
								>
									{tx.type === "credit" ? "+" : "-"}
									{Math.abs(tx.amount).toLocaleString()}
								</p>
								<div className="sm:text-center">
									<span
										className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
											tx.type === "credit"
												? "bg-emerald-500/15 text-emerald-300"
												: "bg-amber-500/15 text-amber-300"
										}`}
									>
										{tx.type}
									</span>
								</div>
								<div className="sm:text-right space-y-0.5">
									<p className="text-xs text-slate-500">
										{tx.created_at
											? new Date(tx.created_at).toLocaleDateString()
											: "N/A"}
									</p>
									{tx.status && tx.status !== "Completed" && (
										<span className="text-[10px] text-red-400 bg-red-500/10 px-1 py-0.5 rounded">
											{tx.status}
										</span>
									)}
								</div>
							</div>
						))
					)}
				</div>

				{/* Pagination */}
				{txPageCount > 1 && (
					<div className="p-4 border-t border-white/5 flex items-center justify-between">
						<p className="text-xs text-slate-500">
							Page {txPage + 1} of {txPageCount} · {filteredTx.length} results
						</p>
						<div className="flex gap-1">
							<button
								type="button"
								onClick={() => setTxPage((p) => Math.max(p - 1, 0))}
								disabled={txPage === 0}
								className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
							>
								← Prev
							</button>
							{Array.from({ length: Math.min(txPageCount, 5) }, (_, i) => {
								const start = Math.max(
									0,
									Math.min(txPage - 2, txPageCount - 5),
								);
								const page = start + i;
								return (
									<button
										key={page}
										type="button"
										onClick={() => setTxPage(page)}
										className={`w-8 h-8 text-xs rounded-lg border font-medium transition-colors ${
											txPage === page
												? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
												: "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
										}`}
									>
										{page + 1}
									</button>
								);
							})}
							<button
								type="button"
								onClick={() =>
									setTxPage((p) => Math.min(p + 1, txPageCount - 1))
								}
								disabled={txPage >= txPageCount - 1}
								className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
							>
								Next →
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
