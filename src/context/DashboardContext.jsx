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
			status: "Running", // Default to running
			uptime: "Just now",
			ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
		};
		setResources((prev) => [newResource, ...prev]);
	};

	const removeResource = (id) => {
		setResources((prev) => prev.filter((r) => r.id !== id));
	};

	const deductCredits = async (amount, description) => {
		const newTransaction = {
			id: `tx_${Date.now()}`,
			date: new Date().toISOString().split("T")[0],
			description: description,
			amount: -amount,
			status: "Completed",
			type: "debit",
		};
		setTransactions((prev) => [newTransaction, ...prev]);

		if (!user) {
			return;
		}

		const { error } = await supabase.from("credit_transactions").insert({
			user_id: user.id,
			description: newTransaction.description,
			amount: newTransaction.amount,
			type: newTransaction.type,
			status: newTransaction.status,
		});

		if (error) {
			console.warn("Unable to persist debit transaction to Supabase.", error);
		} else {
			loadTransactions();
		}
	};

	return (
		<DashboardContext.Provider
			value={{
				resources,
				balance,
				transactions,
				currentPlan,
				addResource,
				removeResource,
				refreshTransactions: loadTransactions,
				deductCredits,
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
