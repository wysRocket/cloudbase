import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useDashboard } from "../../context/DashboardContext";

const statusClass = {
	Running: "bg-green-500 text-green-400",
	Provisioning: "bg-blue-500 text-blue-400",
	Suspended: "bg-amber-500 text-amber-400",
	Failed: "bg-red-500 text-red-400",
};

export default function ResourceList({ typeFilter, title }) {
	const { resources, resourceJobs, mutateResourceLifecycle, runResourceSync } = useDashboard();
	const [busy, setBusy] = useState({});
	const [errorMap, setErrorMap] = useState({});

	const filteredResources = typeFilter
		? resources.filter((r) => r.type.toLowerCase().includes(typeFilter.toLowerCase()))
		: resources;

	const runAction = async (resourceId, action) => {
		setBusy((prev) => ({ ...prev, [`${resourceId}:${action}`]: true }));
		setErrorMap((prev) => ({ ...prev, [resourceId]: "" }));
		try {
			if (action === "sync") await runResourceSync(resourceId);
			else await mutateResourceLifecycle(resourceId, action);
		} catch (error) {
			setErrorMap((prev) => ({ ...prev, [resourceId]: error?.message || "Action failed" }));
		} finally {
			setBusy((prev) => ({ ...prev, [`${resourceId}:${action}`]: false }));
		}
	};

	return (
		<>
			<div className="flex justify-between items-end mb-10">
				<div>
					<h1 className="text-3xl font-bold mb-2">{title}</h1>
					<p className="text-slate-400">Manage your {title.toLowerCase()} and deployments.</p>
				</div>
				<Link to="/dashboard/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2">New Resource</Link>
			</div>

			<div className="bg-[#0f1629] border border-white/5 rounded-2xl overflow-hidden">
				{filteredResources.length === 0 ? (
					<div className="p-12 text-center text-slate-400">No {title.toLowerCase()} found.</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="bg-white/5 text-slate-400">
								<tr>
									<th className="p-4 font-medium pl-6">Name</th><th className="p-4 font-medium">Region</th><th className="p-4 font-medium">IP Address</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right pr-6">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{filteredResources.map((res) => (
									<React.Fragment key={res.id}>
										<tr key={res.id} className="hover:bg-white/5 transition-colors align-top">
											<td className="p-4 pl-6 font-medium text-white">{res.name}</td>
											<td className="p-4 text-slate-400">{res.region}</td>
											<td className="p-4 text-slate-400 font-mono text-xs">{res.ip || "pending"}</td>
											<td className="p-4"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${(statusClass[res.status] || "bg-slate-400 text-slate-300").split(" ")[0]}`}></span><span className={(statusClass[res.status] || "text-slate-300").split(" ")[1]}>{res.status}</span></div></td>
											<td className="p-4 pr-6">
												<div className="flex flex-wrap justify-end gap-2">
													<button onClick={() => runAction(res.id, "sync")} disabled={busy[`${res.id}:sync`]} className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50">Sync now</button>
													<button onClick={() => runAction(res.id, "suspend")} disabled={busy[`${res.id}:suspend`] || res.status === "Suspended"} className="text-amber-400 hover:text-amber-300 disabled:opacity-50">Suspend</button>
													<button onClick={() => runAction(res.id, "resume")} disabled={busy[`${res.id}:resume`] || res.status === "Running"} className="text-green-400 hover:text-green-300 disabled:opacity-50">Resume</button>
													<button onClick={() => runAction(res.id, "delete")} disabled={busy[`${res.id}:delete`]} className="text-red-400 hover:text-red-300 disabled:opacity-50">Delete</button>
												</div>
											</td>
										</tr>
										<tr className="bg-black/10">
											<td colSpan={5} className="px-6 py-3 text-xs text-slate-300">
												<div className="mb-2 font-semibold">Job timeline</div>
												{(resourceJobs[res.id] || []).length === 0 ? <div className="text-slate-500">No jobs yet.</div> : (resourceJobs[res.id] || []).slice(0, 5).map((job) => <div key={`${job.at}:${job.message}`} className="mb-1">{new Date(job.at).toLocaleString()} · {job.message}</div>)}
												{(res.status === "Failed" || errorMap[res.id]) && (
													<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-300">
														<div className="font-medium">Action failed</div>
														<div className="text-red-200/90">{errorMap[res.id] || res.lastError || "Provider returned an error."}</div>
														<div className="mt-2 flex gap-3"><button className="underline" onClick={() => runAction(res.id, "sync")}>Retry sync</button><Link to="/support" className="underline">Contact support</Link></div>
													</motion.div>
												)}
											</td>
										</tr>
									</React.Fragment>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</>
	);
}
