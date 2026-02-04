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

function App() {
    return (
        <Layout>
            <ScrollToTop />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/services/vps" element={<VPS />} />
                <Route path="/services/kubernetes" element={<Kubernetes />} />
                <Route path="/services/gpu" element={<GPU />} />
                <Route path="/services/database" element={<Database />} />
                <Route path="/services/game-servers" element={<GameServers />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                <Route path="/support" element={<Support />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/sign-in/*" element={<SignInPage />} />
                <Route path="/sign-up/*" element={<SignUpPage />} />
            </Routes>
        </Layout>
    )
}

export default App

