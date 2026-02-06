import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { docsData } from '../data/docsData'

// Simple fallback renderer if react-markdown isn't installed or desired yet, 
// though for this task I will just render lines or simple HTML structure if needed.
// Given constraints, I'll update it to render the content string cleanly.

export default function Docs() {
    const [activeSection, setActiveSection] = useState('getting-started')
    const [activeArticle, setActiveArticle] = useState(null)

    const sections = docsData

    const handleArticleClick = (article) => {
        setActiveArticle(article)
        // Scroll to top of content
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSectionChange = (key) => {
        setActiveSection(key)
        setActiveArticle(null)
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
                            <div className="overflow-hidden">
                                <motion.span
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="block"
                                >
                                    Documentation
                                </motion.span>
                            </div>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl">
                            Everything you need to build and scale on WysCloudTop.
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
                                        onClick={() => handleSectionChange(key)}
                                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeSection === key ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'hover:bg-white/10 text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        <span>{section.icon}</span>
                                        {section.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Content */}
                    <div className="md:col-span-3 min-h-[600px]">
                        {activeArticle ? (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass p-8 rounded-2xl"
                            >
                                <button
                                    onClick={() => setActiveArticle(null)}
                                    className="mb-6 text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to {sections[activeSection].title}
                                </button>

                                <article className="prose prose-invert max-w-none">
                                    {/* Simple Markdown Rendering Fallback */}
                                    <div className="whitespace-pre-wrap font-sans text-slate-300">
                                        {activeArticle.content.split('\n').map((line, i) => {
                                            if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold text-white mb-6 mt-2">{line.replace('# ', '')}</h1>
                                            if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-white mb-4 mt-8">{line.replace('## ', '')}</h2>
                                            if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-white mb-3 mt-6">{line.replace('### ', '')}</h3>
                                            if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-2">{line.replace('- ', '')}</li>
                                            if (line.startsWith('1. ')) return <li key={i} className="ml-4 mb-2 list-decimal">{line.replace(/^\d+\. /, '')}</li>
                                            if (line.startsWith('```')) return null // Skip code block markers for simple render
                                            if (line.trim() === '') return <br key={i} />
                                            return <p key={i} className="mb-4 leading-relaxed">{line}</p>
                                        })}
                                    </div>
                                </article>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                                    <span className="text-4xl">{sections[activeSection].icon}</span>
                                    {sections[activeSection].title}
                                </h2>
                                <p className="text-slate-400 mb-8 text-lg">{sections[activeSection].description}</p>

                                <div className="space-y-4">
                                    {sections[activeSection].articles.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => handleArticleClick(item)}
                                            className="glass p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group border border-white/5 hover:border-cyan-500/30"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-xl font-bold mb-2 group-hover:text-cyan-400 transition-colors">{item.title}</h3>
                                                    <p className="text-slate-400">{item.desc}</p>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </section>

            {/* Help CTA */}
            <section className="py-16 px-6 bg-white/5">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
                    <p className="text-slate-400 mb-8">Can&apos;t find what you&apos;re looking for? Our support team is here to help.</p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link to="/support" className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all shadow-lg shadow-cyan-500/20">
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
