import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useDashboard } from "../../context/DashboardContext";
import {
	triggerProviderLifecycle,
	triggerProviderSyncStatus,
} from "../../lib/resellerApi";

const ACTIONS = ["suspend", "resume", "delete", "sync"];

const actionLabels = {
	suspend: "Suspend",
	resume: "Resume",
	delete: "Delete",
	sync: "Sync",
};

function Spinner() {
	return (
		<svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
			<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-30" />
			<path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" />
		</svg>
	);
}

export default function ResourceList({ typeFilter, title }) {
	const { resources, refreshResources } = useDashboard();
	const [pendingByResource, setPendingByResource] = useState({});
	const [errorByResource, setErrorByResource] = useState({});

	const filteredResources = useMemo(
		() =>
			typeFilter
				? resources.filter((r) => r.type.toLowerCase().includes(typeFilter.toLowerCase()))
				: resources,
		[resources, typeFilter],
	);

	const performAction = async (resourceId, action) => {
		setPendingByResource((prev) => ({ ...prev, [resourceId]: action }));
		setErrorByResource((prev) => ({ ...prev, [resourceId]: "" }));

		try {
			if (action === "sync") {
				await triggerProviderSyncStatus({ resourceId });
			} else {
				await triggerProviderLifecycle({ resourceId, operation: action });
			}
			await refreshResources();
		} catch (error) {
			setErrorByResource((prev) => ({
				...prev,
				[resourceId]: error.message || `Unable to ${actionLabels[action].toLowerCase()} resource.`,
			}));
		} finally {
			setPendingByResource((prev) => ({ ...prev, [resourceId]: null }));
		}
	};

	return (
		<>
			<div className="flex justify-between items-end mb-10">
				<div>
					<h1 className="text-3xl font-bold mb-2">{title}</h1>
					<p className="text-slate-400">Manage your {title.toLowerCase()} and deployments.</p>
				</div>
				<Link to="/dashboard/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					New Resource
				</Link>
			</div>

			<div className="bg-[#0f1629] border border-white/5 rounded-2xl overflow-hidden">
				{filteredResources.length === 0 ? (
					<div className="p-12 text-center text-slate-400">
						<div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
							</svg>
						</div>
						<h3 className="text-lg font-medium text-white mb-2">No {title.toLowerCase()} found</h3>
						<p className="mb-6">You don't have any {title.toLowerCase()} in this region.</p>
						<Link to="/dashboard/new" className="text-cyan-400 hover:text-cyan-300 font-medium">Deploy Now &rarr;</Link>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="bg-white/5 text-slate-400">
								<tr>
									<th className="p-4 font-medium pl-6">Name</th>
									<th className="p-4 font-medium">Region</th>
									<th className="p-4 font-medium">IP Address</th>
									<th className="p-4 font-medium">Status</th>
									<th className="p-4 font-medium text-right pr-6">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{filteredResources.map((res) => {
									const pendingAction = pendingByResource[res.id];
									return (
										<tr key={res.id} className="hover:bg-white/5 transition-colors align-top">
											<td className="p-4 pl-6 font-medium text-white">{res.name}</td>
											<td className="p-4 text-slate-400">{res.region}</td>
											<td className="p-4 text-slate-400 font-mono text-xs">{res.ip}</td>
											<td className="p-4">
												<div className="flex items-center gap-2">
													<span className="w-2 h-2 rounded-full bg-green-500"></span>
													<span className="text-green-400">{res.status}</span>
												</div>
											</td>
											<td className="p-4 text-right pr-6">
												<div className="flex justify-end flex-wrap gap-2">
													{ACTIONS.map((action) => {
														const isPending = pendingAction === action;
														return (
															<button
																key={action}
																disabled={Boolean(pendingAction)}
																onClick={() => performAction(res.id, action)}
																className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 px-2.5 py-1 text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed"
															>
																{isPending && <Spinner />}
																{actionLabels[action]}
															</button>
														);
													})}
												</div>
												{errorByResource[res.id] ? (
													<motion.p
														initial={{ opacity: 0, y: -4 }}
														animate={{ opacity: 1, y: 0 }}
														className="mt-2 text-xs text-rose-400"
													>
														{errorByResource[res.id]}
													</motion.p>
												) : null}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</>
	);
}
