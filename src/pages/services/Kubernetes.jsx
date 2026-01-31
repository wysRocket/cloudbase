import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Kubernetes() {
    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="aurora-blob w-[600px] h-[600px] bg-blue-500/20 top-0 left-0 animate-aurora"></div>
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-4 block">Kubernetes</span>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            Container<br /><span className="text-cyan-400">Orchestration</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mb-10">
                            Managed Kubernetes clusters that scale with your applications. Deploy, manage, and scale containerized workloads with ease.
                        </p>
                        <div className="flex gap-4 flex-wrap">
                            <Link to="/contact" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all">
                                Create Cluster
                            </Link>
                            <Link to="/docs" className="px-8 py-4 glass rounded-full font-bold hover:bg-white/10 transition-all">
                                Read Documentation
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Kubernetes Made Simple</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { title: 'Managed Control Plane', desc: 'We handle the Kubernetes control plane, you focus on your apps', icon: '🎛️' },
                            { title: 'Auto-scaling', desc: 'Automatically scale pods based on demand', icon: '📈' },
                            { title: 'Load Balancing', desc: 'Built-in load balancers for your services', icon: '⚖️' },
                            { title: 'Private Registry', desc: 'Secure container registry included', icon: '📦' },
                            { title: 'Monitoring', desc: 'Full observability with metrics and logs', icon: '📊' },
                            { title: 'CI/CD Ready', desc: 'Integrate with your deployment pipelines', icon: '🔄' },
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

            {/* Pricing */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Cluster Pricing</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: 'Development', nodes: '1-3 nodes', cpu: '2 vCPU each', ram: '4GB each', price: 40 },
                            { name: 'Production', nodes: '3-10 nodes', cpu: '4 vCPU each', ram: '8GB each', price: 100, popular: true },
                            { name: 'Enterprise', nodes: 'Unlimited', cpu: 'Custom', ram: 'Custom', price: 'Custom' },
                        ].map((plan, i) => (
                            <div key={i} className={`glass p-10 rounded-[2rem] ${plan.popular ? 'border-cyan-500/50 bg-cyan-950/20 scale-105' : ''}`}>
                                {plan.popular && <div className="text-xs bg-cyan-500 text-black px-3 py-1 rounded-full uppercase font-bold inline-block mb-4">Popular</div>}
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <p className="text-slate-400 mb-6">{plan.nodes}</p>
                                <div className="text-4xl font-black mb-6">
                                    {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}
                                    {typeof plan.price === 'number' && <span className="text-lg font-normal text-slate-500">/mo</span>}
                                </div>
                                <ul className="space-y-2 mb-8 text-slate-400">
                                    <li>• {plan.cpu}</li>
                                    <li>• {plan.ram}</li>
                                    <li>• Managed control plane</li>
                                </ul>
                                <Link to="/contact" className={`w-full py-3 rounded-xl font-bold text-center block ${plan.popular ? 'bg-cyan-600 hover:bg-cyan-500' : 'glass hover:bg-white/10'}`}>
                                    {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}
