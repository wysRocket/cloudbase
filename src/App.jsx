import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import DashboardLayout from "./layouts/DashboardLayout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Cookies from "./pages/Cookies";
import Docs from "./pages/Docs";
import AdminObservability from "./pages/dashboard/AdminObservability";
import AdminServiceCatalog from "./pages/dashboard/AdminServiceCatalog";
import Billing from "./pages/dashboard/Billing";
import Dashboard from "./pages/dashboard/Dashboard";
import NewService from "./pages/dashboard/NewService";
import ResourceList from "./pages/dashboard/ResourceList";
import Settings from "./pages/dashboard/Settings";
import Home from "./pages/Home";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import Support from "./pages/Support";
import Database from "./pages/services/Database";
import GameServers from "./pages/services/GameServers";
import GPU from "./pages/services/GPU";
import Kubernetes from "./pages/services/Kubernetes";
import VPS from "./pages/services/VPS";
import Terms from "./pages/Terms";

function App() {
	return (
		<>
			<ScrollToTop />
			<Routes>
				<Route
					path="/"
					element={
						<Layout>
							<Home />
						</Layout>
					}
				/>
				<Route
					path="/services/vps"
					element={
						<Layout>
							<VPS />
						</Layout>
					}
				/>
				<Route
					path="/services/kubernetes"
					element={
						<Layout>
							<Kubernetes />
						</Layout>
					}
				/>
				<Route
					path="/services/gpu"
					element={
						<Layout>
							<GPU />
						</Layout>
					}
				/>
				<Route
					path="/services/database"
					element={
						<Layout>
							<Database />
						</Layout>
					}
				/>
				<Route
					path="/services/game-servers"
					element={
						<Layout>
							<GameServers />
						</Layout>
					}
				/>
				<Route
					path="/pricing"
					element={
						<Layout>
							<Pricing />
						</Layout>
					}
				/>
				<Route
					path="/docs"
					element={
						<Layout>
							<Docs />
						</Layout>
					}
				/>
				<Route
					path="/about"
					element={
						<Layout>
							<About />
						</Layout>
					}
				/>
				<Route
					path="/privacy"
					element={
						<Layout>
							<Privacy />
						</Layout>
					}
				/>
				<Route
					path="/terms"
					element={
						<Layout>
							<Terms />
						</Layout>
					}
				/>
				<Route
					path="/cookies"
					element={
						<Layout>
							<Cookies />
						</Layout>
					}
				/>
				<Route
					path="/support"
					element={
						<Layout>
							<Support />
						</Layout>
					}
				/>
				<Route
					path="/contact"
					element={
						<Layout>
							<Contact />
						</Layout>
					}
				/>
				<Route
					path="/sign-in/*"
					element={
						<Layout>
							<SignInPage />
						</Layout>
					}
				/>
				<Route
					path="/sign-up/*"
					element={
						<Layout>
							<SignUpPage />
						</Layout>
					}
				/>

				{/* Protected Dashboard Routes */}
				<Route
					path="/dashboard/*"
					element={
						<DashboardLayout>
							<Routes>
								<Route index element={<Dashboard />} />
								<Route path="new" element={<NewService />} />
								<Route
									path="vps"
									element={
										<ResourceList title="VPS Instances" typeFilter="VPS" />
									}
								/>
								<Route
									path="kubernetes"
									element={
										<ResourceList
											title="Kubernetes Clusters"
											typeFilter="Kubernetes"
										/>
									}
								/>
								<Route
									path="databases"
									element={
										<ResourceList
											title="Managed Databases"
											typeFilter="Database"
										/>
									}
								/>
								<Route path="billing" element={<Billing />} />
								<Route path="settings" element={<Settings />} />
								<Route path="admin" element={<AdminObservability />} />
								<Route path="admin/catalog" element={<AdminServiceCatalog />} />
							</Routes>
						</DashboardLayout>
					}
				/>
			</Routes>
		</>
	);
}

export default App;
