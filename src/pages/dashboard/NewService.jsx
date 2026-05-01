import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "../../context/DashboardContext";

const serviceTypes = [
	{ id: "vps", name: "Virtual Private Server", price: "100 credits/mo", cost: 100, typeName: "VPS (Standard)" },
	{ id: "k8s", name: "Kubernetes Cluster", price: "1000 credits/mo", cost: 1000, typeName: "Kubernetes (Managed)" },
	{ id: "db", name: "Managed Database", price: "300 credits/mo", cost: 300, typeName: "Database (Managed)" },
	{ id: "gpu", name: "GPU Instance", price: "50 credits/hr", cost: 50, typeName: "GPU (H100)" },
	{ id: "game", name: "Game Server", price: "180 credits/mo", cost: 180, typeName: "Game Server (Bootstrap)" },
];
const regions = ["us-east", "us-west", "eu-central", "eu-west", "asia-east"];
const gpuProfiles = { "GPU (H100)": ["us-east", "eu-central"] };

export default function NewService() {
	const navigate = useNavigate();
	const { addResource, createManagedDatabase, balance, deductCredits } = useDashboard();
	const [selectedType, setSelectedType] = useState("vps");
	const [selectedRegion, setSelectedRegion] = useState("us-east");
	const [deployError, setDeployError] = useState("");
	const [isDeploying, setIsDeploying] = useState(false);
	const selectedTypeInfo = serviceTypes.find((t) => t.id === selectedType);
	const canDeploy = balance >= selectedTypeInfo.cost;
	const gpuConstraint = useMemo(() => {
		const allowed = gpuProfiles[selectedTypeInfo.typeName];
		if (!allowed) return "";
		return allowed.includes(selectedRegion) ? "" : "H100 capacity is limited to US-East and EU-Central.";
	}, [selectedRegion, selectedTypeInfo.typeName]);

	const handleDeploy = async () => {
		if (!canDeploy || gpuConstraint) return;
		setIsDeploying(true);
		setDeployError("");
		try {
			await deductCredits(`${selectedTypeInfo.typeName} deployment`, selectedTypeInfo.cost);
			const name = `${selectedTypeInfo.id}-${Math.random().toString(36).substr(2, 5)}`;
			if (selectedType === "db") {
				createManagedDatabase({ name, region: selectedRegion, engine: "postgres" });
			} else {
				addResource({
					name,
					type: selectedTypeInfo.typeName,
					region: selectedRegion,
					price: selectedTypeInfo.price,
					status: selectedType === "k8s" || selectedType === "game" ? "provisioning" : "running",
					bootstrap: selectedType === "game" ? { provider: "droplet", strategy: "cloud-init" } : undefined,
				});
			}
			navigate("/dashboard");
		} catch {
			setDeployError("Failed to deduct credits. Please try again.");
		} finally {
			setIsDeploying(false);
		}
	};

	return (
		<div className="space-y-4">
			<h1 className="text-3xl font-bold">Deploy New Service</h1>
			<select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>{serviceTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
			<select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</select>
			{gpuConstraint && <p className="text-amber-400">{gpuConstraint}</p>}
			{deployError && <p className="text-red-400">{deployError}</p>}
			<button onClick={handleDeploy} disabled={isDeploying || !canDeploy || !!gpuConstraint}>Deploy Resource</button>
		</div>
	);
}
