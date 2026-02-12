import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Pricing() {
    const vpsPlans = [
        { name: 'Hobbyist', ram: '1GB', storage: '25GB', cpu: '1 vCPU', price: 5.00 },
        { name: 'Developer', ram: '2GB', storage: '50GB', cpu: '1 vCPU', price: 10.00 },
        { name: 'Startup', ram: '4GB', storage: '80GB', cpu: '2 vCPU', price: 20.00, popular: true },
        { name: 'Business', ram: '8GB', storage: '160GB', cpu: '4 vCPU', price: 40.00 },
        { name: 'Enterprise', ram: '16GB', storage: '320GB', cpu: '8 vCPU', price: 80.00 },
    ]

    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-16 px-6 overflow-hidden">
                <div className="aurora-blob w-[600px] h-[600px] bg-cyan-500/20 top-0 right-0 animate-aurora"></div>
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            <div className="overflow-hidden">
                                <motion.span
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="block"
                                >
                                    Simple,
                                </motion.span>
                            </div>
                            <div className="overflow-hidden text-cyan-400">
                                <motion.span
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                    className="block"
                                >
                                    Transparent Pricing
                                </motion.span>
                            </div>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            No hidden fees. No surprises. Pay only for what you use.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* VPS Pricing */}
            <section className="py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8">VPS Hosting</h2>
                    <div className="grid md:grid-cols-5 gap-6">
                        {vpsPlans.map((plan, i) => (
                            <div key={i} className={`glass p-6 rounded-2xl ${plan.popular ? 'border-cyan-500/50 bg-cyan-950/20 scale-105' : ''}`}>
                                {plan.popular && <div className="text-xs bg-cyan-500 text-black px-2 py-1 rounded-full font-bold mb-3">Popular</div>}
                                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                                <div className="text-3xl font-black mb-4">€{plan.price.toFixed(2)}<span className="text-sm font-normal text-slate-500">/mo</span></div>
                                <ul className="space-y-2 text-sm text-slate-400 mb-6">
                                    <li>{plan.ram} RAM</li>
                                    <li>{plan.storage} NVMe</li>
                                    <li>{plan.cpu}</li>
                                </ul>
                                <Link to="/contact" className={`w-full py-2 rounded-lg font-bold text-center block text-sm ${plan.popular ? 'bg-cyan-600 hover:bg-cyan-500' : 'glass hover:bg-white/10'}`}>
                                    Deploy
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Kubernetes Pricing */}
            <section className="py-16 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8">Kubernetes Clusters</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: 'Development', nodes: '1-3 nodes', price: 40.00 },
                            { name: 'Production', nodes: '3-10 nodes', price: 100.00, popular: true },
                            { name: 'Enterprise', nodes: 'Unlimited', price: 'Custom' },
                        ].map((plan, i) => (
                            <div key={i} className={`glass p-8 rounded-2xl ${plan.popular ? 'border-cyan-500/50 bg-cyan-950/20' : ''}`}>
                                {plan.popular && <div className="text-xs bg-cyan-500 text-black px-2 py-1 rounded-full font-bold inline-block mb-3">Popular</div>}
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <p className="text-slate-400 mb-4">{plan.nodes}</p>
                                <div className="text-4xl font-black mb-6">
                                    {typeof plan.price === 'number' ? `€${plan.price.toFixed(2)}` : plan.price}
                                    {typeof plan.price === 'number' && <span className="text-lg font-normal text-slate-500">/mo</span>}
                                </div>
                                <Link to="/contact" className={`w-full py-3 rounded-xl font-bold text-center block ${plan.popular ? 'bg-cyan-600 hover:bg-cyan-500' : 'glass hover:bg-white/10'}`}>
                                    Get Started
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Database Pricing */}
            <section className="py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8">Managed Databases</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: 'Starter', ram: '1GB', storage: '10GB', price: 15.00 },
                            { name: 'Professional', ram: '4GB', storage: '50GB', price: 50.00, popular: true },
                            { name: 'Business', ram: '16GB', storage: '200GB', price: 150.00 },
                        ].map((plan, i) => (
                            <div key={i} className={`glass p-8 rounded-2xl ${plan.popular ? 'border-cyan-500/50 bg-cyan-950/20' : ''}`}>
                                {plan.popular && <div className="text-xs bg-cyan-500 text-black px-2 py-1 rounded-full font-bold inline-block mb-3">Popular</div>}
                                <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                                <div className="text-4xl font-black mb-4">€{plan.price.toFixed(2)}<span className="text-lg font-normal text-slate-500">/mo</span></div>
                                <ul className="space-y-2 text-slate-400 mb-6">
                                    <li>{plan.ram} RAM</li>
                                    <li>{plan.storage} Storage</li>
                                    <li>Daily Backups</li>
                                </ul>
                                <Link to="/contact" className={`w-full py-3 rounded-xl font-bold text-center block ${plan.popular ? 'bg-cyan-600 hover:bg-cyan-500' : 'glass hover:bg-white/10'}`}>
                                    Get Started
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* GPU Pricing */}
            <section className="py-16 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8">GPU Servers</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full glass rounded-2xl overflow-hidden">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="p-4 text-left">GPU</th>
                                    <th className="p-4 text-left">VRAM</th>
                                    <th className="p-4 text-left">Hourly</th>
                                    <th className="p-4 text-left">Monthly</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { name: 'NVIDIA T4', vram: '16GB', hourly: 0.50, monthly: 300.00 },
                                    { name: 'NVIDIA A10G', vram: '24GB', hourly: 1.00, monthly: 600.00 },
                                    { name: 'NVIDIA A100', vram: '40GB', hourly: 3.00, monthly: 1800.00 },
                                    { name: 'NVIDIA H100', vram: '80GB', hourly: 5.00, monthly: 3000.00 },
                                ].map((gpu, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-4 font-bold">{gpu.name}</td>
                                        <td className="p-4 text-slate-400">{gpu.vram}</td>
                                        <td className="p-4 text-cyan-400">€{gpu.hourly.toFixed(2)}/hr</td>
                                        <td className="p-4 text-cyan-400">€{gpu.monthly.toFixed(2)}/mo</td>
                                        <td className="p-4">
                                            <Link to="/contact" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold">
                                                Request
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Game Servers */}
            <section className="py-16 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-8">Game Servers</h2>
                    <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[
                            { name: 'Minecraft', price: 5.00 },
                            { name: 'Rust', price: 15.00 },
                            { name: 'CS2', price: 10.00 },
                            { name: 'ARK', price: 20.00 },
                            { name: 'Valheim', price: 8.00 },
                            { name: 'Terraria', price: 5.00 },
                        ].map((game, i) => (
                            <div key={i} className="glass p-6 rounded-xl text-center hover:bg-white/10 transition-all">
                                <h3 className="font-bold mb-2">{game.name}</h3>
                                <p className="text-cyan-400 font-bold">From €{game.price.toFixed(2)}/mo</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 bg-gradient-to-b from-transparent to-cyan-900/20">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-6">Need Custom Pricing?</h2>
                    <p className="text-slate-400 mb-8">Contact our sales team for enterprise solutions and volume discounts.</p>
                    <Link to="/contact" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:text-white transition-all inline-block">
                        Contact Sales
                    </Link>
                </div>
            </section>
        </>
    )
}
