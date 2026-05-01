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

function mapResourceRow(resource) {
	return {
		id: resource.id,
		name: resource.display_name,
		type: resource.service_type,
		region: resource.region,
		price: "-",
		status: resource.status,
		uptime: resource.updated_at ? new Date(resource.updated_at).toLocaleString() : "-",
		ip: resource.connection_details?.ipv4 || "Pending",
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


	const [resourceEvents, setResourceEvents] = useState({});

	const [currentPlan, setCurrentPlan] = useState(() => {
		const saved = localStorage.getItem("wys_plan");
		return saved ? JSON.parse(saved) : defaultPlan;
	});

	const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
	const [resourceActionState, setResourceActionState] = useState({});

	const mapResource = useCallback((res) => ({
		...res,
		status: res.status || "Unknown",
		events: (res.provision_events || []).slice().sort((a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		),
	}), []);

	const loadResources = useCallback(async () => {
		if (!user) return;

		const { data, error } = await supabase
			.from("service_resources")
			.select("id, display_name, service_type, region, status, updated_at, connection_details")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });

		if (error) {
			console.warn("Unable to load resources from Supabase.", error);
			return;
		}

		setResources((data || []).map(mapResourceRow));
	}, [user]);

	const loadResourceEvents = useCallback(async () => {
		if (!user) return;

		const { data, error } = await supabase
			.from("provision_events")
			.select("resource_id, event_type, message, created_at")
			.order("created_at", { ascending: false })
			.limit(200);

		if (error) {
			console.warn("Unable to load provision events from Supabase.", error);
			return;
		}

		const byResource = {};
		for (const evt of data || []) {
			if (!byResource[evt.resource_id]) {
				byResource[evt.resource_id] = evt;
			}
		}

		setResourceEvents(byResource);
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
		loadTransactions();
		loadResources();
		loadResourceEvents();
	}, [loadTransactions, loadResources, loadResourceEvents]);


	useEffect(() => {
		if (!user) return;

		const intervalId = setInterval(() => {
			loadResources();
			loadResourceEvents();
		}, 15000);

		return () => clearInterval(intervalId);
	}, [user, loadResources, loadResourceEvents]);

	const changePlan = (plan) => {
		setCurrentPlan(plan);
	};

	const addResource = (resource) => {
		const newResource = {
			...resource,
			id: resource.id || Math.random().toString(36).slice(2, 11),
			status: resource.status || "pending",
			uptime: "Just now",
			ip: resource.ip || "Pending",
		};
		setResources((prev) => [newResource, ...prev]);
	};

	const removeResource = (id) => {
		setResources((prev) => prev.filter((r) => r.id !== id));
	};

	const setActionLoading = (id, action, loading, error = "") => {
		setResourceActionState((prev) => ({
			...prev,
			[id]: {
				action: loading ? action : "",
				error,
			},
		}));
	};

	const runLifecycleAction = useCallback(
		async (id, action) => {
			setActionLoading(id, action, true);
			try {
				if (action === "delete") {
					const { error } = await supabase.from("resources").delete().eq("id", id).eq("user_id", user.id);
					if (error) throw error;
				} else {
					const { error } = await supabase
						.from("resources")
						.update({ status: action === "suspend" ? "Suspended" : "Running" })
						.eq("id", id)
						.eq("user_id", user.id);
					if (error) throw error;
				}

				await loadResources();
				setActionLoading(id, action, false);
			} catch (error) {
				setActionLoading(id, action, false, error.message || "Action failed");
			}
		},
		[loadResources, user],
	);

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
				resourceActionState,
				balance,
				transactions,
				currentPlan,
				addResource,
				removeResource,
				suspendResource: (id) => runLifecycleAction(id, "suspend"),
				resumeResource: (id) => runLifecycleAction(id, "resume"),
				deleteResource: (id) => runLifecycleAction(id, "delete"),
				syncResource: loadResources,
				deductCredits,
				refreshResources: loadResources,
				refreshTransactions: loadTransactions,
				resourceEvents,
				refreshResourceEvents: loadResourceEvents,
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
