import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useScroll } from 'framer-motion'
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import LiveStatus from './LiveStatus'

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
    const [scrolled, setScrolled] = useState(false)
    const { scrollYProgress } = useScroll()
    const location = useLocation()
    const isLightPage = ['/sign-up', '/sign-in'].some(path => location.pathname.startsWith(path))

    // Dynamic text colors
    const textColor = (isLightPage && !scrolled) ? 'text-slate-900' : 'text-slate-100'
    const hoverColor = (isLightPage && !scrolled) ? 'hover:text-cyan-600' : 'hover:text-cyan-400'
    const iconColor = (isLightPage && !scrolled) ? 'text-slate-900' : 'text-current'

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <>
            {/* Scroll Progress Bar */}
            <motion.div
                style={{ scaleX: scrollYProgress }}
                className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 origin-left z-[101]"
            />

            <nav className={`fixed top-0 w-full z-[100] px-4 md:px-6 transition-all duration-300 border-b border-white/5 ${scrolled ? 'py-2 bg-black/80 backdrop-blur-xl' : 'py-4 glass'}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <div className={`transition-all duration-300 ${scrolled ? 'h-8' : 'h-10'} w-auto overflow-hidden`}>
                            <img src="/images/logo-n.png" className="h-full w-auto object-cover scale-150" alt="WysCloudBase Logo" loading="lazy" />
                        </div>
                        <span className={`text-xl font-bold tracking-tighter transition-colors ${textColor}`}>WysCloudBase</span>
                        <div className="hidden lg:block ml-4">
                            <LiveStatus />
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className={`hidden md:flex items-center gap-8 text-sm font-medium transition-colors ${textColor}`}>
                        {navLinks.map((link) => (
                            link.submenu ? (
                                <div
                                    key={link.name}
                                    className="relative"
                                    onMouseEnter={() => setServicesOpen(true)}
                                    onMouseLeave={() => setServicesOpen(false)}
                                >
                                    <button className={`${hoverColor} transition-colors flex items-center gap-1`}>
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
                                                className="absolute top-full left-0 mt-2 w-48 bg-[#0a0f1d] border border-white/10 rounded-xl py-2 shadow-xl"
                                            >
                                                {link.submenu.map((sub) => (
                                                    <Link
                                                        key={sub.name}
                                                        to={sub.href}
                                                        className="block px-4 py-2 text-slate-100 hover:bg-white/10 hover:text-cyan-400 transition-colors"
                                                    >
                                                        {sub.name}
                                                    </Link>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <Link
                                    key={link.name}
                                    to={link.href}
                                    className={`${hoverColor} transition-colors`}
                                >
                                    {link.name}
                                </Link>
                            )
                        ))}
                        <SignedOut>
                            <Link
                                to="/sign-in"
                                className={`${hoverColor} transition-colors`}
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/contact"
                                className="bg-cyan-600 hover:bg-cyan-500 px-5 py-2 rounded-full text-white transition-all transform hover:scale-105"
                            >
                                Contact Sales
                            </Link>
                        </SignedOut>
                        <SignedIn>
                            <UserButton
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        avatarBox: "w-10 h-10"
                                    }
                                }}
                            />
                        </SignedIn>
                    </div>

                    {/* Mobile Toggle */}
                    <button onClick={() => setMobileOpen(!mobileOpen)} className={`md:hidden p-2 ${iconColor}`}>
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
                            <div className="p-6 flex flex-col gap-4 text-center text-slate-100">
                                <Link to="/#overview" onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Overview</Link>
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
                                <Link to="/pricing" onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Pricing</Link>
                                <Link to="/docs" onClick={() => setMobileOpen(false)} className="hover:text-white transition-colors">Docs</Link>
                                <SignedOut>
                                    <Link
                                        to="/sign-in"
                                        onClick={() => setMobileOpen(false)}
                                        className="border border-cyan-600 py-3 rounded-lg w-full block"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        to="/contact"
                                        onClick={() => setMobileOpen(false)}
                                        className="bg-cyan-600 py-3 rounded-lg w-full block"
                                    >
                                        Contact Sales
                                    </Link>
                                </SignedOut>
                                <SignedIn>
                                    <div className="flex justify-center">
                                        <UserButton afterSignOutUrl="/" />
                                    </div>
                                </SignedIn>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </>
    )
}
