import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [session, setSession] = useState(null);
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isAdmin, setIsAdmin] = useState(false);
	const [adminLoading, setAdminLoading] = useState(true);

	async function refreshAdminStatus(nextUser) {
		if (!nextUser) {
			setIsAdmin(false);
			setAdminLoading(false);
			return;
		}

		setAdminLoading(true);
		const { data, error } = await supabase
			.from("user_roles")
			.select("role")
			.eq("user_id", nextUser.id)
			.eq("role", "admin")
			.limit(1);

		if (error) {
			console.warn("Unable to verify admin role", error);
			setIsAdmin(false);
			setAdminLoading(false);
			return;
		}

		setIsAdmin(Boolean(data?.length));
		setAdminLoading(false);
	}

	useEffect(() => {
		let mounted = true;

		async function bootstrapSession() {
			try {
				const { data } = await supabase.auth.getSession();
				if (!mounted) {
					return;
				}

				setSession(data.session);
				const nextUser = data.session?.user ?? null;
				setUser(nextUser);
				setLoading(false);

				// Do not block app render on admin lookup.
				refreshAdminStatus(nextUser);
			} catch (error) {
				console.warn("Unable to restore auth session", error);
				if (mounted) {
					setSession(null);
					setUser(null);
					setIsAdmin(false);
					setAdminLoading(false);
					setLoading(false);
				}
			}
		}

		bootstrapSession();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, nextSession) => {
			setSession(nextSession);
			const nextUser = nextSession?.user ?? null;
			setUser(nextUser);
			setLoading(false);
			refreshAdminStatus(nextUser);
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, []);

	const value = useMemo(
		() => ({
			session,
			user,
			loading,
			isAdmin,
			adminLoading,
			signIn: async ({ email, password }) => {
				return supabase.auth.signInWithPassword({ email, password });
			},
			signUp: async ({ email, password }) => {
				return supabase.auth.signUp({
					email,
					password,
					options: {
						emailRedirectTo: `${window.location.origin}/dashboard`,
					},
				});
			},
			signOut: async () => {
				return supabase.auth.signOut();
			},
			signInWithOAuth: async (provider) => {
				return supabase.auth.signInWithOAuth({
					provider,
					options: {
						redirectTo: `${window.location.origin}/dashboard`,
					},
				});
			},
		}),
		[session, user, loading, isAdmin, adminLoading],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}
