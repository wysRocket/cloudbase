import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
    { name: 'Overview', href: '/#overview' },
    {
        name: 'Services',
        href: '#',
        submenu: [
            { name: 'VPS Hosting', href: '/services/vps' },
            { name: 'Kubernetes', href: '/services/kubernetes' },
            { name: 'GPU Servers', href: '/services/gpu' },
            { name: 'Database', href: '/services/database' },
            { name: 'Game Servers', href: '/services/game-servers' },
        ]
    },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Docs', href: '/docs' },
]

export default function Navbar() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [servicesOpen, setServicesOpen] = useState(false)
    useLocation()

    return (
        <nav className="fixed top-0 w-full z-[100] px-6 py-4 transition-all duration-300 glass border-b border-white/5">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2">
                    <img src="/images/image-1.png" className="h-10 w-auto" alt="WysCloudBase Logo" loading="lazy" />
                    <span className="text-xl font-bold tracking-tighter">WysCloudBase</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                    {navLinks.map((link) => (
                        link.submenu ? (
                            <div
                                key={link.name}
                                className="relative"
                                onMouseEnter={() => setServicesOpen(true)}
                                onMouseLeave={() => setServicesOpen(false)}
                            >
                                <button className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                                    {link.name}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <AnimatePresence>
                                    {servicesOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full left-0 mt-2 w-48 glass rounded-xl py-2 border border-white/10"
                                        >
                                            {link.submenu.map((sub) => (
                                                <Link
                                                    key={sub.name}
                                                    to={sub.href}
                                                    className="block px-4 py-2 hover:bg-white/10 hover:text-cyan-400 transition-colors"
                                                >
                                                    {sub.name}
                                                </Link>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            link.href.startsWith('/#') ? (
                                <a key={link.name} href={link.href} className="hover:text-cyan-400 transition-colors">
                                    {link.name}
                                </a>
                            ) : (
                                <Link key={link.name} to={link.href} className="hover:text-cyan-400 transition-colors">
                                    {link.name}
                                </Link>
                            )
                        )
                    ))}
                    <Link
                        to="/contact"
                        className="bg-cyan-600 hover:bg-cyan-500 px-5 py-2 rounded-full text-white transition-all transform hover:scale-105"
                    >
                        Get Started
                    </Link>
                </div>

                {/* Mobile Toggle */}
                <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden absolute top-full left-0 w-full bg-[#0a0f1d] border-b border-white/10 overflow-hidden"
                    >
                        <div className="p-6 flex flex-col gap-4 text-center">
                            <a href="/#overview" onClick={() => setMobileOpen(false)}>Overview</a>
                            <div className="border-t border-white/10 pt-4">
                                <p className="text-cyan-400 text-sm mb-2">Services</p>
                                {navLinks[1].submenu.map((sub) => (
                                    <Link
                                        key={sub.name}
                                        to={sub.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="block py-2 text-slate-300 hover:text-white"
                                    >
                                        {sub.name}
                                    </Link>
                                ))}
                            </div>
                            <Link to="/pricing" onClick={() => setMobileOpen(false)}>Pricing</Link>
                            <Link to="/docs" onClick={() => setMobileOpen(false)}>Docs</Link>
                            <Link
                                to="/contact"
                                onClick={() => setMobileOpen(false)}
                                className="bg-cyan-600 py-3 rounded-lg"
                            >
                                Get Started
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
