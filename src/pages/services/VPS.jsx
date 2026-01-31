import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function VPS() {
    const plans = [
        { name: 'Basic', ram: '1GB', storage: '25GB NVMe', cpu: '1 vCPU', bandwidth: '1TB', price: 5 },
        { name: 'Standard', ram: '2GB', storage: '50GB NVMe', cpu: '1 vCPU', bandwidth: '2TB', price: 10 },
        { name: 'Professional', ram: '4GB', storage: '80GB NVMe', cpu: '2 vCPU', bandwidth: '4TB', price: 20, popular: true },
        { name: 'Business', ram: '8GB', storage: '160GB NVMe', cpu: '4 vCPU', bandwidth: '5TB', price: 40 },
        { name: 'Enterprise', ram: '16GB', storage: '320GB NVMe', cpu: '8 vCPU', bandwidth: '6TB', price: 80 },
    ]

    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="aurora-blob w-[600px] h-[600px] bg-cyan-500/20 top-0 right-0 animate-aurora"></div>
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-4 block">VPS Hosting</span>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            Lightning-Fast<br /><span className="text-cyan-400">Virtual Servers</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mb-10">
                            Deploy blazing-fast virtual private servers with NVMe storage in 55 seconds. Full root access, dedicated resources, and 99.9% uptime guaranteed.
                        </p>
                        <div className="flex gap-4 flex-wrap">
                            <Link to="/contact" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all">
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
            <section className="py-20 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Why Choose Our VPS?</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'NVMe Storage', desc: 'Ultra-fast SSD storage for lightning quick read/write speeds', icon: '⚡' },
                            { title: 'Full Root Access', desc: 'Complete control over your server with SSH access', icon: '🔑' },
                            { title: '99.9% Uptime', desc: 'Enterprise-grade reliability backed by SLA', icon: '✅' },
                            { title: 'DDoS Protection', desc: 'Built-in protection against attacks', icon: '🛡️' },
                            { title: 'Global Locations', desc: '15+ datacenter locations worldwide', icon: '🌍' },
                            { title: 'Instant Deploy', desc: 'Server ready in under 55 seconds', icon: '🚀' },
                        ].map((f, i) => (
                            <div key={i} className="glass p-8 rounded-2xl hover:bg-white/10 transition-all">
                                <span className="text-4xl mb-4 block">{f.icon}</span>
                                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                                <p className="text-slate-400">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Plans */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">VPS Plans</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full glass rounded-2xl overflow-hidden">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="p-6 text-left">Plan</th>
                                    <th className="p-6 text-left">RAM</th>
                                    <th className="p-6 text-left">Storage</th>
                                    <th className="p-6 text-left">CPU</th>
                                    <th className="p-6 text-left">Bandwidth</th>
                                    <th className="p-6 text-left">Price</th>
                                    <th className="p-6"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {plans.map((plan, i) => (
                                    <tr key={i} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${plan.popular ? 'bg-cyan-500/10' : ''}`}>
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
            </section>

            {/* CTA */}
            <section className="py-20 px-6 bg-gradient-to-b from-transparent to-cyan-900/20">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-6">Ready to Deploy?</h2>
                    <p className="text-slate-400 mb-8">Start with our 14-day free trial. No credit card required.</p>
                    <Link to="/contact" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:text-white transition-all inline-block">
                        Get Started Now
                    </Link>
                </div>
            </section>
        </>
    )
}
