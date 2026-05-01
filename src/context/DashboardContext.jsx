import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const DashboardContext = createContext();
const initialResources = [];
const initialTransactions = [];
const defaultPlan = { name: "Pro Plan", credits: 2900, price: 29 };

const callJsonFunction = async (name, payload) => {
	const { data, error } = await supabase.functions.invoke(name, {
		body: payload,
	});
	if (error) throw error;
	return data;
};

export function DashboardProvider({ children }) {
	const { user } = useAuth();
	const [resources, setResources] = useState(() => JSON.parse(localStorage.getItem("wys_resources") || "[]"));
	const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem("wys_transactions") || "[]"));
	const [currentPlan, setCurrentPlan] = useState(() => JSON.parse(localStorage.getItem("wys_plan") || JSON.stringify(defaultPlan)));
	const [resourceJobs, setResourceJobs] = useState({});

	const balance = useMemo(() => transactions.reduce((sum, tx) => sum + tx.amount, 0), [transactions]);

	const loadTransactions = useCallback(async () => {
		if (!user) return;
		const { data, error } = await supabase
			.from("credit_transactions")
			.select("id, description, amount, type, status, currency_paid, currency, created_at")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });
		if (error) return;
		setTransactions((data || []).map((tx) => ({
			id: `tx_${tx.id}`,
			date: new Date(tx.created_at).toISOString().split("T")[0],
			description: tx.description,
			amount: tx.amount,
			status: tx.status || "Completed",
			type: tx.type,
			currencyPaid: tx.currency_paid || "-",
			currency: tx.currency || null,
		})));
	}, [user]);

	useEffect(() => {
		localStorage.setItem("wys_resources", JSON.stringify(resources));
		localStorage.setItem("wys_transactions", JSON.stringify(transactions));
		localStorage.setItem("wys_plan", JSON.stringify(currentPlan));
	}, [resources, transactions, currentPlan]);

	useEffect(() => {
		loadTransactions();
	}, [loadTransactions]);

	const pushJobEvent = useCallback((resourceId, message, state = "info") => {
		setResourceJobs((prev) => {
			const existing = prev[resourceId] || [];
			return {
				...prev,
				[resourceId]: [{ at: new Date().toISOString(), message, state }, ...existing].slice(0, 25),
			};
		});
	}, []);

	const runResourceSync = useCallback(async (resourceId) => {
		const syncData = await callJsonFunction("provider-sync-status", { resourceId });
		setResources((prev) => prev.map((res) => (res.id === resourceId ? { ...res, ...syncData } : res)));
		if (syncData?.timelineEntry) {
			pushJobEvent(resourceId, syncData.timelineEntry.message, syncData.timelineEntry.state);
		}
		return syncData;
	}, [pushJobEvent]);

	useEffect(() => {
		if (resources.length === 0) return;
		const timer = setInterval(() => {
			for (const res of resources) {
				runResourceSync(res.id).catch(() => {});
			}
		}, 15000);
		return () => clearInterval(timer);
	}, [resources, runResourceSync]);

	const deployResource = useCallback(async ({ typeInfo, region }) => {
		if (!user) throw new Error("Not authenticated");
		const optimisticId = crypto.randomUUID();
		const baseResource = {
			id: optimisticId,
			name: `${typeInfo.id}-${Math.random().toString(36).slice(2, 7)}`,
			type: typeInfo.typeName,
			region,
			price: typeInfo.price,
			status: "Provisioning",
			ip: "pending",
		};
		setResources((prev) => [baseResource, ...prev]);
		pushJobEvent(optimisticId, "Deployment queued", "pending");

		try {
			pushJobEvent(optimisticId, "Creating payment record", "running");
			const payment = await callJsonFunction("create-payment-session", {
				amount: typeInfo.cost,
				description: `${typeInfo.typeName} deployment`,
			});
			pushJobEvent(optimisticId, "Payment authorized", "success");

			const lifecycle = await callJsonFunction("provider-lifecycle", {
				action: "deploy",
				resource: baseResource,
				payment,
			});
			setResources((prev) => prev.map((r) => (r.id === optimisticId ? { ...r, ...lifecycle.resource, status: lifecycle.resource?.status || "Running" } : r)));
			pushJobEvent(optimisticId, "Resource deployed", "success");
			await loadTransactions();
		} catch (error) {
			setResources((prev) => prev.map((r) => (r.id === optimisticId ? { ...r, status: "Failed", lastError: error.message || "Deployment failed" } : r)));
			pushJobEvent(optimisticId, error.message || "Deployment failed", "failed");
			throw error;
		}
	}, [loadTransactions, pushJobEvent, user]);

	const mutateResourceLifecycle = useCallback(async (resourceId, action) => {
		pushJobEvent(resourceId, `${action} requested`, "running");
		const data = await callJsonFunction("provider-lifecycle", { action, resourceId });
		setResources((prev) => prev.filter((res) => !(action === "delete" && res.id === resourceId)).map((res) => (res.id === resourceId ? { ...res, ...data.resource, status: data.resource?.status || res.status } : res)));
		pushJobEvent(resourceId, `${action} completed`, "success");
		return data;
	}, [pushJobEvent]);

	return (
		<DashboardContext.Provider
			value={{
				resources,
				resourceJobs,
				balance,
				transactions,
				currentPlan,
				refreshTransactions: loadTransactions,
				changePlan: setCurrentPlan,
				deployResource,
				mutateResourceLifecycle,
				runResourceSync,
			}}
		>
			{children}
		</DashboardContext.Provider>
	);
}

export function useDashboard() {
	return useContext(DashboardContext);
}
