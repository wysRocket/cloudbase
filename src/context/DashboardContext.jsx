import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";
import {
	buildServiceMetadata,
	normalizeResourceStatus,
} from "../lib/resourceOrchestration";

const DashboardContext = createContext();

const initialResources = []; // Empty by default as per user request

const initialTransactions = [];

const defaultPlan = { name: "Pro Plan", credits: 2900, price: 29 };

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

	// Calculate balance from transactions
	const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

	const loadTransactions = useCallback(async () => {
		if (!user) {
			return;
		}

		const { data, error } = await supabase
			.from("credit_transactions")
			.select(
				"id, description, amount, type, status, currency_paid, currency, created_at",
			)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });

		if (error) {
			console.warn("Unable to load credit transactions from Supabase.", error);
			return;
		}

		const mapped = (data || []).map((tx) => ({
			id: `tx_${tx.id}`,
			date: new Date(tx.created_at).toISOString().split("T")[0],
			description: tx.description,
			amount: tx.amount,
			status: tx.status || "Completed",
			type: tx.type,
			currencyPaid: tx.currency_paid || "-",
			currency: tx.currency || null,
		}));

		setTransactions(mapped);
	}, [user]);

	useEffect(() => {
		localStorage.setItem("wys_resources", JSON.stringify(resources));
		localStorage.setItem("wys_transactions", JSON.stringify(transactions));
		localStorage.setItem("wys_plan", JSON.stringify(currentPlan));
	}, [resources, transactions, currentPlan]);

	useEffect(() => {
		loadTransactions();
	}, [loadTransactions]);

	const changePlan = (plan) => {
		setCurrentPlan(plan);
	};

	const addResource = (resource) => {
		const newResource = {
			...resource,
			id: Math.random().toString(36).substr(2, 9),
			status: normalizeResourceStatus(resource.status || "provisioning"),
			uptime: "Just now",
			ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			metadata: buildServiceMetadata(resource.serviceId, resource.metadata),
		};
		setResources((prev) => [newResource, ...prev]);
	};

	const updateResourceStatus = (id, status) => {
		setResources((prev) =>
			prev.map((resource) =>
				resource.id === id
					? { ...resource, status: normalizeResourceStatus(status) }
					: resource,
			),
		);
	};

	const removeResource = (id) => {
		setResources((prev) => prev.filter((r) => r.id !== id));
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
				updateResourceStatus,
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
