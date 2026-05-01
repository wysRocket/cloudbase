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

function mapResource(resource) {
	return {
		id: resource.id,
		name: resource.name,
		region: resource.region,
		type: resource.type || "Resource",
		ip: resource.ip_address || resource.ip || "-",
		status: resource.status || "Pending",
		uptime: resource.uptime || null,
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

	const refreshResources = useCallback(async () => {
		if (!user) {
			setResources(initialResources);
			return;
		}

		const { data, error } = await supabase
			.from("service_resources")
			.select("id, name, region, type, ip_address, ip, status, uptime")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });

		if (error) {
			console.warn("Unable to load resources from Supabase.", error);
			return;
		}

		setResources((data || []).map(mapResource));
	}, [user]);

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
		refreshResources();
		loadTransactions();
	}, [refreshResources, loadTransactions]);

	useEffect(() => {
		if (!user) {
			return undefined;
		}

		const channel = supabase
			.channel(`dashboard-resources-${user.id}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "service_resources", filter: `user_id=eq.${user.id}` },
				() => {
					refreshResources();
				},
			)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "provision_events", filter: `user_id=eq.${user.id}` },
				() => {
					refreshResources();
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [user, refreshResources]);

	const changePlan = (plan) => {
		setCurrentPlan(plan);
	};

	const addResource = (resource) => {
		const newResource = {
			...resource,
			id: Math.random().toString(36).substr(2, 9),
			status: "Running",
			uptime: "Just now",
			ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
		};
		setResources((prev) => [newResource, ...prev]);
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
				deductCredits,
				refreshResources,
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
