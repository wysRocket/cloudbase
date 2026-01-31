import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Docs() {
    const [activeSection, setActiveSection] = useState('getting-started')

    const sections = {
        'getting-started': {
            title: 'Getting Started',
            content: [
                { title: 'Quick Start Guide', desc: 'Deploy your first server in under 5 minutes' },
                { title: 'Account Setup', desc: 'Configure your account and billing' },
                { title: 'Dashboard Overview', desc: 'Learn the main dashboard features' },
            ]
        },
        'vps': {
            title: 'VPS Hosting',
            content: [
                { title: 'Creating a VPS', desc: 'Step-by-step VPS deployment' },
                { title: 'SSH Access', desc: 'Connecting to your server' },
                { title: 'Server Management', desc: 'Reboots, snapshots, and more' },
                { title: 'Scaling Resources', desc: 'Upgrade CPU, RAM, and storage' },
            ]
        },
        'kubernetes': {
            title: 'Kubernetes',
            content: [
                { title: 'Creating Clusters', desc: 'Deploy managed Kubernetes' },
                { title: 'kubectl Setup', desc: 'Configure local kubectl access' },
                { title: 'Deployments', desc: 'Deploy your applications' },
                { title: 'Ingress & Load Balancers', desc: 'Expose your services' },
            ]
        },
        'database': {
            title: 'Databases',
            content: [
                { title: 'Creating Databases', desc: 'PostgreSQL, MySQL, Redis, MongoDB' },
                { title: 'Connection Strings', desc: 'Connect your applications' },
                { title: 'Backups & Restore', desc: 'Manage your data safely' },
                { title: 'Scaling', desc: 'Resize your database' },
            ]
        },
        'api': {
            title: 'API Reference',
            content: [
                { title: 'Authentication', desc: 'API keys and tokens' },
                { title: 'VPS Endpoints', desc: 'Manage VPS via API' },
                { title: 'Database Endpoints', desc: 'Manage databases via API' },
                { title: 'Rate Limits', desc: 'API usage limits' },
            ]
        }
    }

    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
                            Documentation
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl">
                            Everything you need to build and scale on WysCloudBase.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Docs Content */}
            <section className="py-12 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
                    {/* Sidebar */}
                    <nav className="glass p-6 rounded-2xl h-fit sticky top-24">
                        <h3 className="font-bold text-cyan-400 mb-4">Documentation</h3>
                        <ul className="space-y-2">
                            {Object.entries(sections).map(([key, section]) => (
                                <li key={key}>
                                    <button
                                        onClick={() => setActiveSection(key)}
                                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeSection === key ? 'bg-cyan-600 text-white' : 'hover:bg-white/10'
                                            }`}
                                    >
                                        {section.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Content */}
                    <div className="md:col-span-3">
                        <h2 className="text-3xl font-bold mb-8">{sections[activeSection].title}</h2>
                        <div className="space-y-4">
                            {sections[activeSection].content.map((item, i) => (
                                <div key={i} className="glass p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-xl font-bold mb-1 group-hover:text-cyan-400 transition-colors">{item.title}</h3>
                                            <p className="text-slate-400">{item.desc}</p>
                                        </div>
                                        <svg className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Help CTA */}
            <section className="py-16 px-6 bg-white/5">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
                    <p className="text-slate-400 mb-8">Can&apos;t find what you&apos;re looking for? Our support team is here to help.</p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link to="/support" className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all">
                            Visit Support Center
                        </Link>
                        <Link to="/contact" className="px-6 py-3 glass rounded-full font-bold hover:bg-white/10 transition-all">
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>
        </>
    )
}
