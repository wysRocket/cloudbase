import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { useDashboard } from "../../context/DashboardContext";
import {
	getKubeconfig,
	requestLifecycleAction,
	syncResourceStatus,
} from "../../lib/resellerApi";

function statusClasses(status) {
	const normalized = String(status || "").toLowerCase();
	if (["active", "running", "succeeded"].includes(normalized))
		return "bg-green-500 text-green-400";
	if (["pending", "provisioning", "processing", "queued"].includes(normalized))
		return "bg-amber-500 text-amber-400";
	if (["failed", "dead_letter", "deleted"].includes(normalized))
		return "bg-red-500 text-red-400";
	if (["suspended"].includes(normalized)) return "bg-slate-500 text-slate-300";
	return "bg-cyan-500 text-cyan-400";
}

export default function ResourceList({ typeFilter, title }) {
	const { resources, resourceEvents, refreshResources, refreshResourceEvents } =
		useDashboard();
	const [actionState, setActionState] = useState({});
	const [actionError, setActionError] = useState({});
	const [expandedResourceId, setExpandedResourceId] = useState(null);
	const [kubeconfigState, setKubeconfigState] = useState({});
	const [revealedCredentials, setRevealedCredentials] = useState({});

	const filteredResources = typeFilter
		? resources.filter((r) =>
				r.type.toLowerCase().includes(typeFilter.toLowerCase()) &&
				r.status !== "deleted",
			)
		: resources.filter((r) => r.status !== "deleted");

	async function runAction(resourceId, action) {
		setActionState((prev) => ({ ...prev, [`${resourceId}:${action}`]: true }));
		setActionError((prev) => ({ ...prev, [resourceId]: "" }));
		try {
			await requestLifecycleAction({ resourceId, action });
			await refreshResources();
			await refreshResourceEvents();
		} catch (error) {
			setActionError((prev) => ({
				...prev,
				[resourceId]: error instanceof Error ? error.message : "Action failed.",
			}));
		} finally {
			setActionState((prev) => ({
				...prev,
				[`${resourceId}:${action}`]: false,
			}));
		}
	}

	async function runSync(resourceId) {
		setActionState((prev) => ({ ...prev, [`${resourceId}:sync`]: true }));
		setActionError((prev) => ({ ...prev, [resourceId]: "" }));
		try {
			await syncResourceStatus({ resourceId });
			await refreshResources();
			await refreshResourceEvents();
		} catch (error) {
			setActionError((prev) => ({
				...prev,
				[resourceId]: error instanceof Error ? error.message : "Sync failed.",
			}));
		} finally {
			setActionState((prev) => ({ ...prev, [`${resourceId}:sync`]: false }));
		}
	}

	function toggleExpanded(resourceId) {
		setExpandedResourceId((current) =>
			current === resourceId ? null : resourceId,
		);
	}

	async function downloadKubeconfig(event, resourceId) {
		event.stopPropagation();
		setKubeconfigState((prev) => ({
			...prev,
			[resourceId]: { loading: true, error: "" },
		}));

		try {
			const yaml = await getKubeconfig({ resourceId });
			const blob = new Blob([yaml], { type: "application/yaml;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "kubeconfig.yaml";
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(url);
			setKubeconfigState((prev) => ({
				...prev,
				[resourceId]: { loading: false, error: "" },
			}));
		} catch (error) {
			setKubeconfigState((prev) => ({
				...prev,
				[resourceId]: {
					loading: false,
					error:
						error instanceof Error
							? error.message
							: "Unable to download kubeconfig.",
				},
			}));
		}
	}

	function renderResourceDetails(res) {
		const serviceType = res.service_type || res.type;

		if (serviceType === "database") {
			const details = res.connection_details;
			const revealed = revealedCredentials[res.id] || false;

			if (!details) {
				return (
					<p className="text-sm text-slate-400">
						No connection details available yet.
					</p>
				);
			}

			const masked = { ...details };
			if (masked.password) {
				masked.password = revealed ? masked.password : "••••••••";
			}

			const displayText = details.connection_string
				? details.connection_string.replace(
						/:([^:@]+)@/,
						revealed ? ":$1@" : ":••••••••@",
					)
				: JSON.stringify(masked, null, 2);

			return (
				<div className="flex flex-col gap-2">
					<pre className="whitespace-pre-wrap break-all rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-slate-200">
						{displayText}
					</pre>
					{(details.password || details.connection_string) && (
						<button
							type="button"
							onClick={() =>
								setRevealedCredentials((prev) => ({
									...prev,
									[res.id]: !prev[res.id],
								}))
							}
							className="self-start rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
						>
							{revealed ? "Hide credentials" : "Reveal credentials"}
						</button>
					)}
				</div>
			);
		}

		if (serviceType === "kubernetes") {
			const state = kubeconfigState[res.id] || {};

			return (
				<div className="flex flex-col items-start gap-2">
					<button
						type="button"
						onClick={(event) => downloadKubeconfig(event, res.id)}
						disabled={state.loading}
						className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{state.loading ? "Loading..." : "Download kubeconfig"}
					</button>
					{state.error && <p className="text-xs text-red-400">{state.error}</p>}
				</div>
			);
		}

		return <p className="text-sm text-slate-400">No additional details</p>;
	}

	return (
		<>
			<div className="flex justify-between items-end mb-10">
				<div>
					<h1 className="text-3xl font-bold mb-2">{title}</h1>
					<p className="text-slate-400">
						Manage your {title.toLowerCase()} and deployments.
					</p>
				</div>
				<Link
					to="/dashboard/new"
					className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2"
				>
					<svg
						aria-hidden="true"
						className="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 4v16m8-8H4"
						/>
					</svg>
					New Resource
				</Link>
			</div>

			<div className="bg-[#0f1629] border border-white/5 rounded-2xl overflow-hidden">
				{filteredResources.length === 0 ? (
					<div className="p-12 text-center text-slate-400">
						<div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg
								aria-hidden="true"
								className="w-8 h-8 text-slate-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 12h14M12 5l7 7-7 7"
								/>
							</svg>
						</div>
						<h3 className="text-lg font-medium text-white mb-2">
							No {title.toLowerCase()} found
						</h3>
						<p className="mb-6">
							You don't have any {title.toLowerCase()} in this region.
						</p>
						<Link
							to="/dashboard/new"
							className="text-cyan-400 hover:text-cyan-300 font-medium"
						>
							Deploy Now &rarr;
						</Link>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="bg-white/5 text-slate-400">
								<tr>
									<th className="p-4 font-medium pl-6 w-12"></th>
									<th className="p-4 font-medium pl-6">Name</th>
									<th className="p-4 font-medium">Region</th>
									<th className="p-4 font-medium">IP Address</th>
									<th className="p-4 font-medium">Status</th>
									<th className="p-4 font-medium text-right pr-6">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-white/5">
								{filteredResources.map((res) => {
									const [dotClass, textClass] = statusClasses(res.status).split(
										" ",
									);
									const isExpanded = expandedResourceId === res.id;
									return (
										<Fragment key={res.id}>
											<tr
												onClick={() => toggleExpanded(res.id)}
												className="cursor-pointer hover:bg-white/5 transition-colors"
											>
												<td className="p-4 pl-6">
													<button
														type="button"
														onClick={(event) => {
															event.stopPropagation();
															toggleExpanded(res.id);
														}}
														className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
														aria-label={
															isExpanded
																? "Collapse resource details"
																: "Expand resource details"
														}
														aria-expanded={isExpanded}
													>
														<svg
															aria-hidden="true"
															className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																strokeWidth={2}
																d="M9 5l7 7-7 7"
															/>
														</svg>
													</button>
												</td>
												<td className="p-4 pl-6 font-medium text-white">
													{res.name}
												</td>
												<td className="p-4 text-slate-400">{res.region}</td>
												<td className="p-4 text-slate-400 font-mono text-xs">
													{res.ip}
												</td>
												<td className="p-4">
													<div className="flex items-center gap-2">
														<span
															className={`w-2 h-2 rounded-full ${dotClass}`}
														></span>
														<div className="flex flex-col">
															<span className={textClass}>{res.status}</span>
															{resourceEvents?.[res.id]?.event_type && (
																<span className="text-[11px] text-slate-500">
																	{resourceEvents[res.id].event_type}
																</span>
															)}
														</div>
													</div>
												</td>
												<td className="p-4 text-right pr-6">
										<div className="flex justify-end gap-2 flex-wrap">
											{!["deleted", "failed", "dead_letter"].includes(res.status) && (
												<>
													<button
														type="button"
														onClick={(event) => {
															event.stopPropagation();
															runAction(res.id, "suspend");
														}}
														disabled={actionState[`${res.id}:suspend`] || res.status === "suspended"}
														className="text-xs px-2 py-1 rounded bg-white/5 text-amber-300 disabled:opacity-50"
													>
														Suspend
													</button>
													<button
														type="button"
														onClick={(event) => {
															event.stopPropagation();
															runAction(res.id, "resume");
														}}
														disabled={actionState[`${res.id}:resume`] || res.status === "active"}
														className="text-xs px-2 py-1 rounded bg-white/5 text-green-300 disabled:opacity-50"
													>
														Resume
													</button>
													<button
														type="button"
														onClick={(event) => {
															event.stopPropagation();
															runAction(res.id, "delete");
														}}
														disabled={actionState[`${res.id}:delete`]}
														className="text-xs px-2 py-1 rounded bg-white/5 text-red-300 disabled:opacity-50"
													>
														Delete
													</button>
												</>
											)}
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													runSync(res.id);
												}}
												disabled={actionState[`${res.id}:sync`]}
												className="text-xs px-2 py-1 rounded bg-white/5 text-cyan-300 disabled:opacity-50"
											>
												Sync
											</button>
										</div>
										{actionError[res.id] && (
											<p className="text-[11px] text-red-400 mt-1">
												{actionError[res.id]}
											</p>
										)}
									</td>									</tr>
											{isExpanded && (
												<tr
													key={`${res.id}:details`}
													className="bg-white/[0.03]"
												>
													<td colSpan={6} className="px-6 py-5">
														<div className="rounded-xl border border-white/10 bg-[#0b1020] p-4">
															{renderResourceDetails(res)}
														</div>
													</td>
												</tr>
											)}
										</Fragment>
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
