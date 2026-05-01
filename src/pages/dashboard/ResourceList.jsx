import { Link } from "react-router-dom";
import { useDashboard } from "../../context/DashboardContext";

const statusColors = {
	running: "text-green-400",
	provisioning: "text-amber-400",
	deleting: "text-orange-400",
	stopped: "text-slate-400",
	error: "text-red-400",
	unknown: "text-slate-500",
};

export default function ResourceList({ typeFilter, title }) {
	const { resources, updateResourceStatus, deleteService } = useDashboard();
	const filteredResources = typeFilter
		? resources.filter((r) => r.type.toLowerCase().includes(typeFilter.toLowerCase()))
		: resources;

	return (
		<div>
			<div className="flex justify-between items-end mb-10">
				<h1 className="text-3xl font-bold mb-2">{title}</h1>
				<Link to="/dashboard/new">New Resource</Link>
			</div>
			{filteredResources.map((res) => (
				<div key={res.id} className="border p-3 mb-2">
					<div>{res.name} ({res.type}) - {res.region}</div>
					<div className={statusColors[res.status] || statusColors.unknown}>{res.status}</div>
					{res.connection && <div>DB: {res.connection.host}:{res.connection.port} · user {res.connection.user} · pass {res.connection.maskedPassword}</div>}
					{res.bootstrap && <div>Bootstrap: {res.bootstrap.provider}/{res.bootstrap.strategy}</div>}
					<div className="flex gap-3">
						<button onClick={() => updateResourceStatus(res.id, "running")}>Set Running</button>
						<button onClick={() => updateResourceStatus(res.id, "stopped")}>Set Stopped</button>
						<button onClick={() => deleteService(res.id)}>Delete</button>
					</div>
				</div>
			))}
		</div>
	);
}
