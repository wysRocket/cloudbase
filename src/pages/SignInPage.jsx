import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OAuthButton = ({ onClick, icon, label }) => (
	<button
		type="button"
		onClick={onClick}
		className="flex items-center justify-center gap-2 w-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
	>
		{icon}
		{label}
	</button>
);

export default function SignInPage() {
	const navigate = useNavigate();
	const { signIn, signInWithOAuth, user, loading } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [oauthError, setOauthError] = useState("");

	const handleOAuth = async (provider) => {
		setOauthError("");
		const { error: err } = await signInWithOAuth(provider);
		if (err)
			setOauthError(err.message || `Unable to sign in with ${provider}.`);
	};

	useEffect(() => {
		if (!loading && user) {
			navigate("/dashboard", { replace: true });
		}
	}, [loading, user, navigate]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setSubmitting(true);
		setError("");
		const { error: signInError } = await signIn({ email, password });
		if (signInError) {
			setError(signInError.message || "Unable to sign in. Please try again.");
		}
		setSubmitting(false);
	};

	return (
		<section className="min-h-screen flex">
			{/* Left Column - Form */}
			<div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-slate-100 relative">
				{/* Supabase Sign In */}
				<div className="w-full max-w-md">
					<div className="w-full rounded-2xl bg-slate-100 border border-slate-200 p-6">
						<h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
						<p className="text-sm text-slate-600 mt-1">
							Access your dashboard and cloud resources.
						</p>

						{/* OAuth Providers */}
						<div className="mt-6 space-y-2">
							<OAuthButton
								onClick={() => handleOAuth("google")}
								label="Continue with Google"
								icon={
									<svg className="w-4 h-4" viewBox="0 0 24 24">
										<path
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
											fill="#4285F4"
										/>
										<path
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
											fill="#34A853"
										/>
										<path
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
											fill="#FBBC05"
										/>
										<path
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
											fill="#EA4335"
										/>
									</svg>
								}
							/>
							<OAuthButton
								onClick={() => handleOAuth("github")}
								label="Continue with GitHub"
								icon={
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
									</svg>
								}
							/>
							<OAuthButton
								onClick={() => handleOAuth("apple")}
								label="Continue with Apple"
								icon={
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
									</svg>
								}
							/>
						</div>

						{oauthError && (
							<p className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mt-2">
								{oauthError}
							</p>
						)}

						<div className="flex items-center gap-3 my-4">
							<div className="flex-1 h-px bg-slate-200" />
							<span className="text-xs text-slate-400 whitespace-nowrap">
								or continue with email
							</span>
							<div className="flex-1 h-px bg-slate-200" />
						</div>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label
									className="block text-sm text-slate-700 mb-1"
									htmlFor="email"
								>
									Email
								</label>
								<input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
								/>
							</div>
							<div>
								<label
									className="block text-sm text-slate-700 mb-1"
									htmlFor="password"
								>
									Password
								</label>
								<input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
								/>
							</div>

							{error && (
								<p className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2">
									{error}
								</p>
							)}

							<button
								type="submit"
								disabled={submitting}
								className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-70 text-white rounded-lg px-4 py-2 font-medium transition-colors"
							>
								{submitting ? "Signing in..." : "Sign in"}
							</button>
						</form>

						<p className="mt-4 text-sm text-slate-600">
							Need an account?{" "}
							<Link to="/sign-up" className="text-cyan-600 hover:text-cyan-700">
								Create one
							</Link>
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="absolute bottom-6 left-6 right-6 text-center text-xs text-slate-500">
					By continuing, you agree to the Cloudbase{" "}
					<Link to="/terms" className="text-cyan-600 hover:underline">
						Terms of Service
					</Link>{" "}
					and{" "}
					<Link to="/privacy" className="text-cyan-600 hover:underline">
						Privacy Policy
					</Link>
					.
				</div>
			</div>

			{/* Right Column - Hero Background */}
			<div className="hidden lg:flex flex-1 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
				{/* Hero Background Image */}
				<div className="absolute inset-0 z-0">
					<img
						src="/images/premium_hero_bg.png"
						className="w-full h-full object-cover"
						alt="Background"
					/>
					{/* Atmospheric Overlays */}
					<div className="absolute inset-0 bg-[#020617]/40 z-[1]"></div>
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/20 to-[#020617] z-[2]"></div>
				</div>

				{/* Subgrid Mesh for Technical Feel */}
				<div
					className="absolute inset-0 opacity-[0.15] z-[3] pointer-events-none"
					style={{
						backgroundImage:
							"radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
						backgroundSize: "48px 48px",
					}}
				></div>

				<div className="relative z-10 max-w-lg text-center">
					<div className="text-6xl mb-6">🚀</div>
					<h2 className="text-3xl font-bold mb-4">Deploy in Seconds</h2>
					<p className="text-lg text-white/80 mb-8">
						Join 50,000+ developers who trust Cloudbase for lightning-fast VPS
						hosting, managed Kubernetes, and GPU servers. No complexity, just
						power.
					</p>
					<div className="flex justify-center gap-8 text-center">
						<div>
							<div className="text-3xl font-bold">99.9%</div>
							<div className="text-sm text-white/70">Uptime SLA</div>
						</div>
						<div>
							<div className="text-3xl font-bold">&lt;30s</div>
							<div className="text-sm text-white/70">Deploy Time</div>
						</div>
						<div>
							<div className="text-3xl font-bold">24/7</div>
							<div className="text-sm text-white/70">Support</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
