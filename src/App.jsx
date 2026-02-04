import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop'
import Layout from './components/Layout'
import Home from './pages/Home'
import VPS from './pages/services/VPS'
import Kubernetes from './pages/services/Kubernetes'
import GPU from './pages/services/GPU'
import Database from './pages/services/Database'
import GameServers from './pages/services/GameServers'
import Pricing from './pages/Pricing'
import Docs from './pages/Docs'
import About from './pages/About'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Cookies from './pages/Cookies'
import Support from './pages/Support'
import Contact from './pages/Contact'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'

import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/dashboard/Dashboard'
import NewService from './pages/dashboard/NewService'

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout><Home /></Layout>} />
            <Route path="/services/vps" element={<Layout><VPS /></Layout>} />
            <Route path="/services/kubernetes" element={<Layout><Kubernetes /></Layout>} />
            <Route path="/services/gpu" element={<Layout><GPU /></Layout>} />
            <Route path="/services/database" element={<Layout><Database /></Layout>} />
            <Route path="/services/game-servers" element={<Layout><GameServers /></Layout>} />
            <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
            <Route path="/docs" element={<Layout><Docs /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
            <Route path="/terms" element={<Layout><Terms /></Layout>} />
            <Route path="/cookies" element={<Layout><Cookies /></Layout>} />
            <Route path="/support" element={<Layout><Support /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/sign-in/*" element={<Layout><SignInPage /></Layout>} />
            <Route path="/sign-up/*" element={<Layout><SignUpPage /></Layout>} />

            {/* Protected Dashboard Routes */}
            <Route path="/dashboard/*" element={
                <DashboardLayout>
                    <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="new" element={<NewService />} />
                    </Routes>
                </DashboardLayout>
            } />
        </Routes>
    )
}

export default App

