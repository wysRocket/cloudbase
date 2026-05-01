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
const initialNotifications = [];
const defaultPlan = { name: "Pro Plan", credits: 2900, price: 29 };

const SERVICE_POLICIES = {
	vps: { readyAfterMs: 6_000, timeoutMs: 18_000, degradedChance: 0.08 },
	kubernetes: { readyAfterMs: 9_000, timeoutMs: 28_000, degradedChance: 0.1 },
	gpu: { readyAfterMs: 7_500, timeoutMs: 22_000, degradedChance: 0.12 },
	database: { readyAfterMs: 5_500, timeoutMs: 16_000, degradedChance: 0.06 },
	game_server: { readyAfterMs: 6_500, timeoutMs: 19_000, degradedChance: 0.09 },
};

const maskValue = (value = "") => {
	if (!value) return "—";
	if (value.length <= 8) return "••••";
	return `${value.slice(0, 4)}••••${value.slice(-4)}`;
};

const encryptForServer = (payload) => btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

const buildPostProvisionSensitive = (serviceType, resourceName, region) => {
	switch (serviceType) {
		case "vps":
			return {
				sshPrivateKey: `-----BEGIN KEY-----${resourceName}${Date.now()}-----END KEY-----`,
				initialAccess: `ssh root@${resourceName}.${region}.cloudbase.local`,
			};
		case "kubernetes":
			return {
				kubeconfig: `apiVersion: v1\nclusters:\n- name: ${resourceName}`,
				clusterToken: `k8s_${Math.random().toString(36).slice(2, 18)}`,
			};
		case "gpu":
			return {
				imageDigest: `sha256:${Math.random().toString(36).slice(2, 18)}`,
				driverBootstrapLog: "nvidia-driver bootstrap started",
			};
		case "database":
			return {
				dbUser: `${resourceName}_admin`,
				dbPassword: Math.random().toString(36).slice(2, 16),
				connectionString: `postgres://${resourceName}_admin:***@${resourceName}.${region}.db.cloudbase.local:5432/app`,
			};
		case "game_server":
			return {
				startupScript: "./start-server.sh --optimized",
				firewallPreset: "UDP 27015, UDP 7777 allowed",
			};
		default:
			return {};
	}
};

const buildPostProvisionDetails = (serviceType) => {
	switch (serviceType) {
		case "vps":
			return "SSH key injection complete; initial access details prepared.";
		case "kubernetes":
			return "Cluster readiness polling complete; kubeconfig staged for delivery.";
		case "gpu":
			return "Image validation completed; GPU driver bootstrap status available.";
		case "database":
			return "Database + user created; connection string vaulted.";
		case "game_server":
			return "Startup scripts applied with required port/firewall presets.";
		default:
			return "Provisioning finished.";
	}
};

export function DashboardProvider({ children }) {
	const { user } = useAuth();
	const [resources, setResources] = useState(() => JSON.parse(localStorage.getItem("wys_resources") || "[]"));
	const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem("wys_transactions") || "[]"));
	const [notifications, setNotifications] = useState(() => JSON.parse(localStorage.getItem("wys_notifications") || "[]"));
	const [currentPlan, setCurrentPlan] = useState(() => JSON.parse(localStorage.getItem("wys_plan") || JSON.stringify(defaultPlan)));
	const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

	const addNotification = useCallback((notification) => {
		setNotifications((prev) => [
			{ id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, read: false, createdAt: new Date().toISOString(), ...notification },
			...prev,
		]);
	}, []);

	const runReadinessLifecycle = useCallback((resourceId, serviceType) => {
		const policy = SERVICE_POLICIES[serviceType] || { readyAfterMs: 7_000, timeoutMs: 20_000, degradedChance: 0.1 };

		setTimeout(() => {
			const timedOut = Math.random() < 0.03;
			if (timedOut) {
				setResources((prev) => prev.map((r) => (r.id === resourceId ? { ...r, status: "failed", readiness: { ...r.readiness, state: "failed", checkedAt: new Date().toISOString() } } : r)));
				addNotification({ event: "failed", channel: ["email", "in-app"], title: "Provisioning failed", message: `${serviceType} resource failed readiness checks after timeout policy (${Math.round(policy.timeoutMs / 1000)}s).` });
				return;
			}

			const degraded = Math.random() < policy.degradedChance;
			setResources((prev) => prev.map((r) => (r.id === resourceId ? { ...r, status: degraded ? "degraded" : "ready", readiness: { ...r.readiness, state: degraded ? "degraded" : "ready", checkedAt: new Date().toISOString() } } : r)));
			addNotification({ event: degraded ? "degraded" : "ready", channel: ["email", "in-app"], title: degraded ? "Resource degraded" : "Resource ready", message: degraded ? `${serviceType} resource is available with minor issues.` : `${serviceType} resource is fully ready for use.` });
		}, policy.readyAfterMs);
	}, [addNotification]);

	const addResource = (resource) => {
		const id = Math.random().toString(36).slice(2, 11);
		const sensitive = buildPostProvisionSensitive(resource.serviceType, resource.name, resource.region);
		const newResource = {
			...resource,
			id,
			status: "created",
			uptime: "Just now",
			ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
			postProvision: {
				details: buildPostProvisionDetails(resource.serviceType),
				encrypted: encryptForServer(sensitive),
				masked: Object.fromEntries(Object.entries(sensitive).map(([k, v]) => [k, maskValue(String(v))])),
			},
			readiness: {
				state: "created",
				timeoutMs: SERVICE_POLICIES[resource.serviceType]?.timeoutMs ?? 20_000,
				checkedAt: new Date().toISOString(),
			},
		};
		setResources((prev) => [newResource, ...prev]);
		addNotification({ event: "created", channel: ["email", "in-app"], title: "Resource created", message: `${resource.type} was created and post-provision handlers are running.` });
		runReadinessLifecycle(id, resource.serviceType);
	};

	const loadTransactions = useCallback(async () => {
		if (!user) return;
		const { data, error } = await supabase.from("credit_transactions").select("id, description, amount, type, status, currency_paid, currency, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
		if (error) return;
		setTransactions((data || []).map((tx) => ({ id: `tx_${tx.id}`, date: new Date(tx.created_at).toISOString().split("T")[0], description: tx.description, amount: tx.amount, status: tx.status || "Completed", type: tx.type, currencyPaid: tx.currency_paid || "-", currency: tx.currency || null })));
	}, [user]);

	useEffect(() => { localStorage.setItem("wys_resources", JSON.stringify(resources)); }, [resources]);
	useEffect(() => { localStorage.setItem("wys_transactions", JSON.stringify(transactions)); }, [transactions]);
	useEffect(() => { localStorage.setItem("wys_notifications", JSON.stringify(notifications)); }, [notifications]);
	useEffect(() => { localStorage.setItem("wys_plan", JSON.stringify(currentPlan)); }, [currentPlan]);
	useEffect(() => { loadTransactions(); }, [loadTransactions]);

	const deductCredits = useCallback(async (description, amount) => {
		if (!user) throw new Error("Not authenticated");
		const { error } = await supabase.from("credit_transactions").insert({ user_id: user.id, description, amount: -Math.abs(amount), type: "debit", status: "completed" });
		if (error) throw error;
		await loadTransactions();
	}, [user, loadTransactions]);

	const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
	const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
	const markOneRead = (id) => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

	return <DashboardContext.Provider value={{ resources, balance, transactions, currentPlan, notifications: notifications.length ? notifications : initialNotifications, unreadCount, addResource, deductCredits, markAllRead, markOneRead, changePlan: setCurrentPlan }}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
	return useContext(DashboardContext);
}
