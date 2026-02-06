import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { docsData } from '../data/docsData'

export default function Support() {
    const [searchQuery, setSearchQuery] = useState('')

    // Transform docsData object into an array for the grid
    const categories = Object.values(docsData).map(cat => ({
        title: cat.title,
        icon: cat.icon,
        articles: cat.articles.map(a => a.title)
    }))

    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-16 px-6">
                <div className="aurora-blob w-[600px] h-[600px] bg-cyan-500/20 top-0 right-0 animate-aurora"></div>
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
                            <div className="overflow-hidden">
                                <motion.span
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="block"
                                >
                                    How can we help?
                                </motion.span>
                            </div>
                        </h1>
                        <div className="relative max-w-xl mx-auto">
                            <input
                                type="text"
                                placeholder="Search for help..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-6 py-4 bg-white/10 border border-white/20 rounded-full text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                            />
                            <svg className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Categories */}
            <section className="py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat, i) => (
                            <div key={i} className="glass p-6 rounded-2xl hover:bg-white/10 transition-all border border-white/5 hover:border-cyan-500/30">
                                <span className="text-3xl mb-4 block">{cat.icon}</span>
                                <h3 className="text-xl font-bold mb-4">{cat.title}</h3>
                                <ul className="space-y-2">
                                    {cat.articles.map((article, j) => (
                                        <li key={j}>
                                            <Link to="/docs" className="text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2 group">
                                                <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                                {article}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Options */}
            <section className="py-16 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-bold mb-8 text-center">Still need help?</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'Email Support', desc: 'Get a response within 24 hours', action: 'Send Email', icon: '✉️' },
                            { title: 'Live Chat', desc: 'Chat with our team in real-time', action: 'Start Chat', icon: '💬' },
                            { title: 'Community', desc: 'Get help from other developers', action: 'Join Discord', icon: '👥' },
                        ].map((opt, i) => (
                            <div key={i} className="glass p-8 rounded-2xl text-center">
                                <span className="text-4xl mb-4 block">{opt.icon}</span>
                                <h3 className="text-xl font-bold mb-2">{opt.title}</h3>
                                <p className="text-slate-400 mb-6">{opt.desc}</p>
                                <Link to="/contact" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold inline-block transition-all shadow-lg shadow-cyan-500/20">
                                    {opt.action}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}
