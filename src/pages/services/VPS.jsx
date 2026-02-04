import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: false, amount: 0.2 },
    transition: { duration: 0.8, ease: "easeOut" }
}

export default function VPS() {
    const plans = [
        { name: 'Micro', ram: '1GB', storage: '25GB', cpu: '1 vCPU', bandwidth: '1TB', price: 5 },
        { name: 'Standard', ram: '2GB', storage: '50GB', cpu: '1 vCPU', bandwidth: '2TB', price: 10, popular: true },
        { name: 'Premium', ram: '4GB', storage: '80GB', cpu: '2 vCPU', bandwidth: '4TB', price: 20 },
        { name: 'Pro', ram: '8GB', storage: '160GB', cpu: '4 vCPU', bandwidth: '5TB', price: 40 },
        { name: 'Enterprise', ram: '16GB', storage: '320GB', cpu: '8 vCPU', bandwidth: '6TB', price: 80 },
    ]

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
                        <span className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-4 block">Scalable Virtual Private Servers</span>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            <div className="overflow-hidden">
                                <motion.span
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="block"
                                >
                                    Next-Gen
                                </motion.span>
                            </div>
                            <div className="overflow-hidden text-cyan-400">
                                <motion.span
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                    className="block"
                                >
                                    VPS Hosting
                                </motion.span>
                            </div>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mb-10">
                            High-performance NVMe SSD storage, lightning-fast network, and 99.9% uptime SLA. Deploy your server in under 60 seconds.
                        </p>
                        <div className="flex gap-4 flex-wrap">
                            <Link to="/dashboard" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all">
                                Deploy Now
                            </Link>
                            <Link to="/pricing" className="px-8 py-4 glass rounded-full font-bold hover:bg-white/10 transition-all">
                                View Full Pricing
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features */}
            <motion.section
                {...fadeInUp}
                className="py-20 px-6 bg-white/5"
            >
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Why Our VPS?</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'NVMe Storage', desc: 'Blazing fast storage for your applications', icon: '⚡' },
                            { title: 'Global Network', desc: '15+ data center locations worldwide', icon: '🌍' },
                            { title: 'Dedicated Resources', desc: 'KVM virtualization ensures guaranteed performance', icon: '🔒' },
                            { title: 'Root Access', desc: 'Full control over your server environment', icon: '🛠️' },
                            { title: 'DDoS Protection', desc: 'Enterprise-grade security included', icon: '🛡️' },
                            { title: 'Instant Scaling', desc: 'Upgrade resources with a single click', icon: '📈' },
                        ].map((f, i) => (
                            <div key={i} className="glass p-8 rounded-2xl hover:bg-white/10 transition-all">
                                <span className="text-4xl mb-4 block">{f.icon}</span>
                                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                                <p className="text-slate-400">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Plans Table */}
            <motion.section
                {...fadeInUp}
                className="py-20 px-6 max-w-7xl mx-auto"
            >
                <div className="glass rounded-[2rem] overflow-hidden border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="p-6 font-bold uppercase text-xs tracking-widest text-slate-500">Plan</th>
                                    <th className="p-6 font-bold uppercase text-xs tracking-widest text-slate-500">RAM</th>
                                    <th className="p-6 font-bold uppercase text-xs tracking-widest text-slate-500">Storage</th>
                                    <th className="p-6 font-bold uppercase text-xs tracking-widest text-slate-500">CPU</th>
                                    <th className="p-6 font-bold uppercase text-xs tracking-widest text-slate-500">Bandwidth</th>
                                    <th className="p-6 font-bold uppercase text-xs tracking-widest text-slate-500">Price</th>
                                    <th className="p-6 font-bold uppercase text-xs tracking-widest text-slate-500"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map((plan, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-6 font-bold">
                                            {plan.name}
                                            {plan.popular && <span className="ml-2 text-xs bg-cyan-500 text-black px-2 py-1 rounded-full">Popular</span>}
                                        </td>
                                        <td className="p-6 text-slate-400">{plan.ram}</td>
                                        <td className="p-6 text-slate-400">{plan.storage}</td>
                                        <td className="p-6 text-slate-400">{plan.cpu}</td>
                                        <td className="p-6 text-slate-400">{plan.bandwidth}</td>
                                        <td className="p-6 font-bold text-cyan-400">${plan.price}/mo</td>
                                        <td className="p-6">
                                            <Link to="/contact" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold transition-all">
                                                Deploy
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.section>

            {/* CTA */}
            <motion.section
                {...fadeInUp}
                className="py-20 px-6 bg-gradient-to-b from-transparent to-cyan-900/20"
            >
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-6">Ready to Deploy?</h2>
                    <p className="text-slate-400 mb-8">Start with our 14-day free trial. No credit card required.</p>
                    <Link to="/contact" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:text-white transition-all inline-block">
                        Get Started Now
                    </Link>
                </div>
            </motion.section>
        </>
    )
}
