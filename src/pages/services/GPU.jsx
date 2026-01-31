import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function GPU() {
    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="aurora-blob w-[600px] h-[600px] bg-purple-500/20 top-0 right-0 animate-aurora"></div>
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-4 block">GPU Servers</span>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            AI-Ready<br /><span className="text-cyan-400">GPU Power</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mb-10">
                            NVIDIA-powered computing for machine learning, deep learning, and AI training. Rent computational power, not just hardware.
                        </p>
                        <div className="flex gap-4 flex-wrap">
                            <Link to="/contact" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all">
                                Request GPU Access
                            </Link>
                            <Link to="/docs" className="px-8 py-4 glass rounded-full font-bold hover:bg-white/10 transition-all">
                                View GPU Specs
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* GPU Types */}
            <section className="py-20 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Available GPUs</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { name: 'NVIDIA T4', vram: '16GB GDDR6', useCase: 'Inference, Light Training', price: 0.50 },
                            { name: 'NVIDIA A10G', vram: '24GB GDDR6', useCase: 'Training, Inference', price: 1.00 },
                            { name: 'NVIDIA A100', vram: '40GB/80GB HBM2e', useCase: 'Heavy Training, Research', price: 3.00, popular: true },
                            { name: 'NVIDIA H100', vram: '80GB HBM3', useCase: 'LLM Training, Cutting-edge AI', price: 5.00 },
                            { name: 'Multi-GPU Cluster', vram: 'Custom', useCase: 'Distributed Training', price: 'Custom' },
                        ].map((gpu, i) => (
                            <div key={i} className={`glass p-8 rounded-2xl ${gpu.popular ? 'border-cyan-500/50 bg-cyan-950/20' : ''}`}>
                                {gpu.popular && <div className="text-xs bg-cyan-500 text-black px-3 py-1 rounded-full uppercase font-bold inline-block mb-4">Most Popular</div>}
                                <h3 className="text-2xl font-bold mb-2">{gpu.name}</h3>
                                <p className="text-cyan-400 mb-4">{gpu.vram}</p>
                                <p className="text-slate-400 text-sm mb-6">{gpu.useCase}</p>
                                <div className="text-3xl font-bold mb-6">
                                    {typeof gpu.price === 'number' ? `$${gpu.price}` : gpu.price}
                                    {typeof gpu.price === 'number' && <span className="text-sm font-normal text-slate-500">/hour</span>}
                                </div>
                                <Link to="/contact" className="w-full py-3 glass rounded-xl font-bold text-center block hover:bg-white/10">
                                    Request Access
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Perfect For</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { title: 'Machine Learning', icon: '🤖' },
                            { title: 'Deep Learning', icon: '🧠' },
                            { title: 'LLM Training', icon: '💬' },
                            { title: 'Computer Vision', icon: '👁️' },
                            { title: '3D Rendering', icon: '🎨' },
                            { title: 'Scientific Computing', icon: '🔬' },
                            { title: 'Video Processing', icon: '🎬' },
                            { title: 'Data Analytics', icon: '📊' },
                        ].map((uc, i) => (
                            <div key={i} className="glass p-6 rounded-xl text-center hover:bg-white/10 transition-all">
                                <span className="text-3xl mb-2 block">{uc.icon}</span>
                                <span className="font-bold">{uc.title}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 bg-gradient-to-b from-transparent to-purple-900/20">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-6">Need Custom GPU Configuration?</h2>
                    <p className="text-slate-400 mb-8">Our team can help you design the perfect GPU cluster for your workload.</p>
                    <Link to="/contact" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:text-white transition-all inline-block">
                        Talk to an Expert
                    </Link>
                </div>
            </section>
        </>
    )
}
