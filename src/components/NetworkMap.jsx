import { motion } from 'framer-motion'
import TiltCard from './TiltCard'

const REGIONS = [
    { name: 'N. America', x: '25%', y: '35%', ping: '12ms', status: 'Optimal' },
    { name: 'Europe', x: '50%', y: '30%', ping: '18ms', status: 'Optimal' },
    { name: 'E. Asia', x: '80%', y: '40%', ping: '22ms', status: 'Stable' },
    { name: 'Singapore', x: '75%', y: '65%', ping: '15ms', status: 'Optimal' },
    { name: 'Australia', x: '85%', y: '80%', ping: '38ms', status: 'Optimal' },
    { name: 'S. America', x: '35%', y: '75%', ping: '45ms', status: 'Stable' },
]

export default function NetworkMap() {
    return (
        <section className="py-24 px-6 max-w-7xl mx-auto overflow-hidden">
            <div className="text-center mb-16">
                <h2 className="text-5xl font-bold mb-4">The Global <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">Pulse.</span></h2>
                <p className="text-slate-400">Real-time throughput across our global edge network.</p>
            </div>

            <TiltCard>
                <div className="glass p-1 rounded-[4rem] relative aspect-[2/1] bg-black/40 overflow-hidden group">
                    {/* World Map Background Image */}
                    <img
                        src="/images/world-map.png"
                        className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-700"
                        alt="Global Network Map"
                    />

                    {/* Stylized Grid Overlay */}
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'radial-gradient(rgba(34,211,238,0.2) 1px, transparent 1px)',
                        backgroundSize: '30px 30px'
                    }}></div>

                    {/* Connection Lines (A few decorative ones) */}
                    <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
                        <motion.path
                            d="M 25% 35% L 50% 30% L 80% 40%"
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            animate={{ strokeDashoffset: [0, -20] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.path
                            d="M 50% 30% L 75% 65%"
                            fill="none"
                            stroke="#22d3ee"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            animate={{ strokeDashoffset: [0, -20] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                    </svg>

                    {/* Regional Nodes */}
                    {REGIONS.map((region, i) => (
                        <motion.div
                            key={i}
                            className="absolute z-10"
                            style={{ left: region.x, top: region.y }}
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{ delay: 0.1 * i, type: 'spring' }}
                        >
                            <div className="relative group/node cursor-crosshair">
                                {/* Pulse Effect */}
                                <span className="absolute -inset-4 bg-cyan-500/20 rounded-full animate-ping"></span>
                                <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] border-2 border-white"></div>

                                {/* Label Tooltip */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 px-4 py-2 rounded-xl opacity-0 group-hover/node:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50">
                                    <div className="text-xs font-bold text-white mb-1">{region.name}</div>
                                    <div className="flex gap-3 text-[10px]">
                                        <span className="text-cyan-400 font-mono">Ping: {region.ping}</span>
                                        <span className="text-green-400">{region.status}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Stats Overlay */}
                    <div className="absolute bottom-8 left-8 flex gap-8">
                        <div>
                            <div className="text-2xl font-black text-white">420<span className="text-cyan-400">Gbps</span></div>
                            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Network Traffic</div>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-white">99.99<span className="text-cyan-400">%</span></div>
                            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Global Uptime</div>
                        </div>
                    </div>
                </div>
            </TiltCard>
        </section>
    )
}
