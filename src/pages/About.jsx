import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function About() {
    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="aurora-blob w-[600px] h-[600px] bg-cyan-500/20 top-0 left-0 animate-aurora"></div>
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            About <span className="text-cyan-400">WysCloudBase</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl">
                            We&apos;re on a mission to make cloud infrastructure accessible to everyone — from students learning to code to enterprises scaling globally.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Story */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8">Our Story</h2>
                    <div className="space-y-6 text-lg text-slate-300 leading-relaxed">
                        <p>
                            WysCloudBase was born out of frustration. We spent years wrestling with complex cloud platforms,
                            drowning in documentation, and paying for features we didn&apos;t need. We knew there had to be a better way.
                        </p>
                        <p>
                            Built on DigitalOcean&apos;s proven infrastructure, WysCloudBase strips away the complexity while keeping
                            the power. No PhD required. No enterprise sales calls. Just raw cloud muscle at your fingertips.
                        </p>
                        <p>
                            Today, we serve over 50,000 developers worldwide — from solo indie hackers to growing startups.
                            Our mission remains simple: make cloud infrastructure accessible to everyone.
                        </p>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="py-20 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Our Values</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'Simplicity First', desc: 'Complex problems deserve simple solutions. We obsess over making things easy.', icon: '✨' },
                            { title: 'Radical Transparency', desc: 'No hidden fees, no surprises. What you see is what you pay.', icon: '👁️' },
                            { title: 'Developer Love', desc: 'We build for developers, by developers. Your success is our success.', icon: '❤️' },
                        ].map((v, i) => (
                            <div key={i} className="glass p-8 rounded-2xl">
                                <span className="text-4xl mb-4 block">{v.icon}</span>
                                <h3 className="text-xl font-bold mb-2">{v.title}</h3>
                                <p className="text-slate-400">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: '12M+', label: 'Servers Deployed' },
                            { value: '50k+', label: 'Active Developers' },
                            { value: '15', label: 'Global Regions' },
                            { value: '99.9%', label: 'Uptime SLA' },
                        ].map((s, i) => (
                            <div key={i} className="text-center">
                                <div className="text-4xl md:text-5xl font-black text-cyan-400 mb-2">{s.value}</div>
                                <p className="text-slate-400">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 bg-gradient-to-b from-transparent to-cyan-900/20">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-6">Join the Movement</h2>
                    <p className="text-slate-400 mb-8">Start building today with a 14-day free trial.</p>
                    <Link to="/contact" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:text-white transition-all inline-block">
                        Get Started Free
                    </Link>
                </div>
            </section>
        </>
    )
}
