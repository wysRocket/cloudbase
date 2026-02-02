import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TiltCard from './TiltCard'

const CONFIGS = {
    cpu: [1, 2, 4, 8, 16, 32],
    ram: [2, 4, 8, 16, 32, 64],
    disk: [25, 50, 100, 250, 500, 1000]
}

export default function ServerBuilder() {
    const [cpu, setCpu] = useState(0)
    const [ram, setRam] = useState(0)
    const [disk, setDisk] = useState(0)

    const calculatePrice = () => {
        const base = 5
        const cpuPrice = CONFIGS.cpu[cpu] * 2
        const ramPrice = CONFIGS.ram[ram] * 1.5
        const diskPrice = (CONFIGS.disk[disk] / 25) * 1
        return (base + cpuPrice + ramPrice + diskPrice).toFixed(2)
    }

    return (
        <section className="py-24 px-6 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                    <h2 className="text-5xl font-bold mb-6">Build Your <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">Custom</span> Core.</h2>
                    <p className="text-slate-400 text-lg mb-12">Drag the sliders to orchestrate your perfect environment. Real-time pricing, zero commitment.</p>

                    <div className="space-y-12">
                        {/* CPU Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="uppercase tracking-widest text-slate-500 font-bold">Compute Power</span>
                                <span className="text-cyan-400 font-mono text-xl">{CONFIGS.cpu[cpu]} vCPUs</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={CONFIGS.cpu.length - 1}
                                value={cpu}
                                onChange={(e) => setCpu(parseInt(e.target.value))}
                                className="w-full accent-cyan-500 bg-white/10 h-2 rounded-full appearance-none cursor-pointer"
                            />
                        </div>

                        {/* RAM Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="uppercase tracking-widest text-slate-500 font-bold">Memory Capacity</span>
                                <span className="text-cyan-400 font-mono text-xl">{CONFIGS.ram[ram]} GB RAM</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={CONFIGS.ram.length - 1}
                                value={ram}
                                onChange={(e) => setRam(parseInt(e.target.value))}
                                className="w-full accent-cyan-500 bg-white/10 h-2 rounded-full appearance-none cursor-pointer"
                            />
                        </div>

                        {/* DISK Slider */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="uppercase tracking-widest text-slate-500 font-bold">NVMe Storage</span>
                                <span className="text-cyan-400 font-mono text-xl">{CONFIGS.disk[disk]} GB</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={CONFIGS.disk.length - 1}
                                value={disk}
                                onChange={(e) => setDisk(parseInt(e.target.value))}
                                className="w-full accent-cyan-500 bg-white/10 h-2 rounded-full appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="order-1 lg:order-2">
                    <TiltCard>
                        <div className="glass p-12 rounded-[4rem] text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent opacity-50"></div>

                            {/* Animated Server Core */}
                            <div className="relative mb-8 flex justify-center h-48">
                                <motion.div
                                    animate={{
                                        y: [0, -10, 0],
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="relative z-10 w-full h-full flex items-center justify-center p-4"
                                >
                                    <img
                                        src="/images/server-core.png"
                                        className="h-full w-auto drop-shadow-[0_0_50px_rgba(34,211,238,0.5)] rounded-2xl relative z-10"
                                        alt="Server Core"
                                    />

                                    {/* Particle effects based on power */}
                                    <AnimatePresence>
                                        {Array.from({ length: cpu + 1 }).map((_, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{ opacity: 0.8, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0 }}
                                                className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full blur-[1px]"
                                                style={{
                                                    top: `${Math.random() * 100}%`,
                                                    left: `${Math.random() * 100}%`,
                                                }}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </motion.div>

                                {/* Background Glow behind image */}
                                <div className="absolute inset-0 bg-cyan-500/10 blur-[100px] rounded-full scale-110 pointer-events-none"></div>
                            </div>

                            <div className="relative z-10">
                                <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-2">Estimated Monthly Cost</p>
                                <div className="text-7xl font-black mb-8">
                                    <span className="text-cyan-400">$</span>{calculatePrice()}
                                </div>
                                <button className="w-full py-6 bg-white text-black text-xl font-black rounded-3xl hover:bg-cyan-400 hover:text-white transition-all transform hover:scale-105 shadow-2xl">
                                    Deploy Now
                                </button>
                                <p className="mt-6 text-slate-500 text-sm italic">Billing is prorated per second.</p>
                            </div>
                        </div>
                    </TiltCard>
                </div>
            </div>
        </section>
    )
}
