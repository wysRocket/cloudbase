import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: false, amount: 0.2 },
    transition: { duration: 0.8, ease: "easeOut" }
}

export default function Database() {
    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="aurora-blob w-[600px] h-[600px] bg-green-500/20 top-0 left-0 animate-aurora"></div>
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-4 block">Database Hosting</span>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            <div className="overflow-hidden">
                                <motion.span
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    className="block"
                                >
                                    Managed
                                </motion.span>
                            </div>
                            <div className="overflow-hidden text-cyan-400">
                                <motion.span
                                    initial={{ y: "100%" }}
                                    animate={{ y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                    className="block"
                                >
                                    Databases
                                </motion.span>
                            </div>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mb-10">
                            Secure, scalable database solutions. PostgreSQL, MySQL, Redis, and MongoDB — fully managed with automatic backups and high availability.
                        </p>
                        <div className="flex gap-4 flex-wrap">
                            <Link to="/contact" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all">
                                Create Database
                            </Link>
                            <Link to="/docs" className="px-8 py-4 glass rounded-full font-bold hover:bg-white/10 transition-all">
                                View Documentation
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Database Types */}
            <motion.section
                {...fadeInUp}
                className="py-20 px-6 bg-white/5"
            >
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Supported Databases</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { name: 'PostgreSQL', desc: 'Powerful, open source relational database', icon: '🐘', color: 'from-blue-500/20' },
                            { name: 'MySQL', desc: 'World\'s most popular open source database', icon: '🐬', color: 'from-orange-500/20' },
                            { name: 'Redis', desc: 'In-memory data store for caching', icon: '⚡', color: 'from-red-500/20' },
                            { name: 'MongoDB', desc: 'Document-oriented NoSQL database', icon: '🍃', color: 'from-green-500/20' },
                        ].map((db, i) => (
                            <div key={i} className={`glass p-8 rounded-2xl bg-gradient-to-br ${db.color} to-transparent hover:scale-105 transition-transform`}>
                                <span className="text-5xl mb-4 block">{db.icon}</span>
                                <h3 className="text-2xl font-bold mb-2">{db.name}</h3>
                                <p className="text-slate-400">{db.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Features */}
            <motion.section
                {...fadeInUp}
                className="py-20 px-6"
            >
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Enterprise Features</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'Automatic Backups', desc: 'Daily backups with point-in-time recovery', icon: '💾' },
                            { title: 'High Availability', desc: 'Automatic failover with standby replicas', icon: '🔄' },
                            { title: 'Encryption', desc: 'Data encrypted at rest and in transit', icon: '🔐' },
                            { title: 'Scaling', desc: 'Easily scale storage and compute', icon: '📈' },
                            { title: 'Monitoring', desc: 'Real-time metrics and alerting', icon: '📊' },
                            { title: 'Connection Pooling', desc: 'Built-in connection management', icon: '🔗' },
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

            {/* Pricing */}
            <motion.section
                {...fadeInUp}
                className="py-20 px-6 bg-gradient-to-b from-transparent to-emerald-900/20"
            >
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Database Pricing</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: 'Starter', ram: '1GB', storage: '10GB', connections: 25, price: 15 },
                            { name: 'Professional', ram: '4GB', storage: '50GB', connections: 100, price: 50, popular: true },
                            { name: 'Business', ram: '16GB', storage: '200GB', connections: 500, price: 150 },
                        ].map((plan, i) => (
                            <div key={i} className={`glass p-10 rounded-[2rem] ${plan.popular ? 'border-cyan-500/50 bg-cyan-950/20 scale-105' : ''}`}>
                                {plan.popular && <div className="text-xs bg-cyan-500 text-black px-3 py-1 rounded-full uppercase font-bold inline-block mb-4">Popular</div>}
                                <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                                <div className="text-4xl font-black mb-6">
                                    ${plan.price}<span className="text-lg font-normal text-slate-500">/mo</span>
                                </div>
                                <ul className="space-y-2 mb-8 text-slate-400">
                                    <li>• {plan.ram} RAM</li>
                                    <li>• {plan.storage} Storage</li>
                                    <li>• {plan.connections} Connections</li>
                                    <li>• Daily Backups</li>
                                </ul>
                                <Link to="/contact" className={`w-full py-3 rounded-xl font-bold text-center block ${plan.popular ? 'bg-cyan-600 hover:bg-cyan-500' : 'glass hover:bg-white/10'}`}>
                                    Get Started
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>
        </>
    )
}
