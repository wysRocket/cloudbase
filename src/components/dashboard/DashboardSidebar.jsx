import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDashboard } from "../../context/DashboardContext";

const navItems = [
	{
		name: "Overview",
		href: "/dashboard",
		icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
	},
	{
		name: "VPS Instances",
		href: "/dashboard/vps",
		icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 01-2 2v4a2 2 0 012 2h14a2 2 0 012-2v-4a2 2 0 01-2-2m-2-4h.01M17 16h.01",
	},
	{
		name: "Kubernetes",
		href: "/dashboard/kubernetes",
		icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
	},
	{
		name: "Databases",
		href: "/dashboard/databases",
		icon: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4",
	},
	{
		name: "Billing",
		href: "/dashboard/billing",
		icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
	},
	{
		name: "Settings",
		href: "/dashboard/settings",
		icon: "M11.983 5.5c.722-1.78 3.312-1.78 4.034 0a1.997 1.997 0 002.42 1.19c1.873-.61 3.705 1.223 3.095 3.095a1.997 1.997 0 001.19 2.42c1.78.722 1.78 3.312 0 4.034a1.997 1.997 0 00-1.19 2.42c.61 1.873-1.223 3.705-3.095 3.095a1.997 1.997 0 00-2.42 1.19c-.722 1.78-3.312 1.78-4.034 0a1.997 1.997 0 00-2.42-1.19c-1.873.61-3.705-1.223-3.095-3.095a1.997 1.997 0 00-1.19-2.42c-1.78-.722-1.78-3.312 0-4.034a1.997 1.997 0 001.19-2.42C6.148 7.913 7.98 6.08 9.853 6.69a1.997 1.997 0 002.13-1.19zM15 14a3 3 0 11-6 0 3 3 0 016 0z",
	},
];

export default function DashboardSidebar({ isOpen, setIsOpen }) {
	const location = useLocation();
	const { currentPlan } = useDashboard();
	const { user, signOut, isAdmin } = useAuth();

	const visibleNavItems = isAdmin
		? [
				...navItems,
				{
					name: "Backoffice",
					href: "/dashboard/admin",
					icon: "M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8zm0-6l2.09 4.26 4.7.68-3.4 3.31.8 4.68L12 12.77 7.81 14.93l.8-4.68-3.4-3.31 4.7-.68L12 2zm7.35 13.64l2.12.31-1.53 1.49.36 2.11-1.89-.99-1.9.99.36-2.11-1.53-1.49 2.12-.31.95-1.92.94 1.92zM4.65 15.64l.94-1.92.95 1.92 2.12.31-1.53 1.49.36 2.11-1.9-.99-1.89.99.36-2.11-1.53-1.49 2.12-.31z",
				},
				{
					name: "Service Catalog",
					href: "/dashboard/admin/catalog",
					icon: "M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z",
				},
			]
		: navItems;

	return (
		<>
			{/* Mobile Overlay */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setIsOpen(false)}
						className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
					/>
				)}
			</AnimatePresence>

			{/* Sidebar */}
			<aside
				className={`
                w-64 bg-slate-900/90 border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 backdrop-blur-xl z-50 transition-transform duration-300
                ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}
			>
				{/* Logo area */}
				<div className="p-6 border-b border-white/5 flex justify-between items-center">
					<Link to="/" className="flex items-center gap-2">
						<div className="h-10 w-auto">
							<img
								src="/images/logo-white.svg"
								className="h-full w-auto object-contain"
								alt="WysCloudBase Logo"
							/>
						</div>
						<span className="text-lg font-bold tracking-tighter text-white">
							WysCloudBase
						</span>
					</Link>
					{/* Close button for mobile */}
					<button
						type="button"
						onClick={() => setIsOpen(false)}
						className="md:hidden text-slate-400 hover:text-white"
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

				{/* Navigation */}
				<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
					{visibleNavItems.map((item) => {
						const isActive = location.pathname === item.href;
						return (
							<Link
								key={item.name}
								to={item.href}
								onClick={() => setIsOpen(false)} // Close on navigate
								className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
									isActive
										? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
										: "text-slate-400 hover:text-white hover:bg-white/5"
								}`}
							>
								<svg
									aria-hidden="true"
									className={`w-5 h-5 ${isActive ? "text-cyan-400" : "text-slate-500"}`}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d={item.icon}
									/>
								</svg>
								<span className="font-medium">{item.name}</span>
							</Link>
						);
					})}
				</nav>

				{/* User Profile Footer */}
				<div className="p-4 border-t border-white/5 bg-black/20">
					<div className="flex items-center gap-3 px-2 py-2">
						<div className="w-9 h-9 rounded-full border border-white/10 bg-slate-800 flex items-center justify-center text-sm font-semibold text-cyan-400 shrink-0">
							{user?.email?.[0]?.toUpperCase() || "U"}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-white truncate">
								{user?.email || "My Account"}
							</p>
							<p className="text-xs text-slate-500 truncate">
								{currentPlan.name}
							</p>
						</div>
						<button
							type="button"
							onClick={signOut}
							className="text-xs px-2 py-1 rounded-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
						>
							Sign out
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}
