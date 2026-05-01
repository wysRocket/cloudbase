import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const DashboardContext = createContext();

const initialResources = [];
const initialTransactions = [];
const defaultPlan = { name: "Pro Plan", credits: 2900, price: 29 };

export const normalizedStatusMap = {
	creating: "provisioning",
	provisioning: "provisioning",
	bootstrapping: "provisioning",
	starting: "provisioning",
	running: "running",
	ready: "running",
	active: "running",
	stopping: "stopped",
	stopped: "stopped",
	deleting: "deleting",
	failed: "error",
	error: "error",
};

export function normalizeServiceStatus(status = "unknown") {
	const normalized = normalizedStatusMap[String(status).toLowerCase()];
	return normalized || "unknown";
}

function createSecureDbConnection(resourceName, dbEngine) {
	const user = `${resourceName.slice(0, 8)}_app`;
	const maskedPassword = `••••••••${Math.floor(1000 + Math.random() * 9000)}`;
	return {
		host: `${resourceName}.internal.db.cloudbase.local`,
		port: dbEngine === "redis" ? 6379 : dbEngine === "mysql" ? 3306 : 5432,
		database: `${resourceName.replace(/-/g, "_")}_main`,
		user,
		maskedPassword,
		sslMode: "require",
		rotationPolicy: "30-day automatic credential rotation",
	};
}

export function DashboardProvider({ children }) {
	const { user } = useAuth();

	const [resources, setResources] = useState(() => {
		const saved = localStorage.getItem("wys_resources");
		return saved ? JSON.parse(saved) : initialResources;
	});
	const [transactions, setTransactions] = useState(() => {
		const saved = localStorage.getItem("wys_transactions");
		return saved ? JSON.parse(saved) : initialTransactions;
	});
	const [currentPlan, setCurrentPlan] = useState(() => {
		const saved = localStorage.getItem("wys_plan");
		return saved ? JSON.parse(saved) : defaultPlan;
	});

	const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

	const loadTransactions = useCallback(async () => {
		if (!user) return;
		const { data, error } = await supabase
			.from("credit_transactions")
			.select("id, description, amount, type, status, currency_paid, currency, created_at")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });
		if (error) {
			console.warn("Unable to load credit transactions from Supabase.", error);
			return;
		}
		setTransactions(
			(data || []).map((tx) => ({
				id: `tx_${tx.id}`,
				date: new Date(tx.created_at).toISOString().split("T")[0],
				description: tx.description,
				amount: tx.amount,
				status: tx.status || "Completed",
				type: tx.type,
				currencyPaid: tx.currency_paid || "-",
				currency: tx.currency || null,
			})),
		);
	}, [user]);

	useEffect(() => {
		localStorage.setItem("wys_resources", JSON.stringify(resources));
		localStorage.setItem("wys_transactions", JSON.stringify(transactions));
		localStorage.setItem("wys_plan", JSON.stringify(currentPlan));
	}, [resources, transactions, currentPlan]);

	useEffect(() => {
		loadTransactions();
	}, [loadTransactions]);

	const changePlan = (plan) => setCurrentPlan(plan);

	const addResource = (resource) => {
		const newResource = {
			...resource,
			id: Math.random().toString(36).substr(2, 9),
			status: normalizeServiceStatus(resource.status || "creating"),
			uptime: "Just now",
			ip: resource.ip || `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
		};
		setResources((prev) => [newResource, ...prev]);
	};

	const updateResourceStatus = (id, status) => {
		setResources((prev) =>
			prev.map((resource) =>
				resource.id === id ? { ...resource, status: normalizeServiceStatus(status) } : resource,
			),
		);
	};

	const createManagedDatabase = ({ name, region, engine }) => {
		const connection = createSecureDbConnection(name, engine);
		addResource({
			name,
			type: "Database (Managed)",
			region,
			price: "300 credits/mo",
			engine,
			status: "provisioning",
			connection,
		});
	};

	const removeResource = (id) => setResources((prev) => prev.filter((r) => r.id !== id));

	const deleteService = (id) => {
		updateResourceStatus(id, "deleting");
		setTimeout(() => removeResource(id), 350);
	};

	const deductCredits = useCallback(
		async (description, amount) => {
			if (!user) throw new Error("Not authenticated");
			const { error } = await supabase.from("credit_transactions").insert({
				user_id: user.id,
				description,
				amount: -Math.abs(amount),
				type: "debit",
				status: "completed",
			});
			if (error) throw error;
			await loadTransactions();
		},
		[user, loadTransactions],
	);

	return (
		<DashboardContext.Provider
			value={{
				resources,
				balance,
				transactions,
				currentPlan,
				addResource,
				removeResource,
				deleteService,
				createManagedDatabase,
				updateResourceStatus,
				normalizeServiceStatus,
				deductCredits,
				refreshTransactions: loadTransactions,
				changePlan,
			}}
		>
			{children}
		</DashboardContext.Provider>
	);
}

export function useDashboard() {
	return useContext(DashboardContext);
}
