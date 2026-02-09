import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import TiltCard from './TiltCard'

const CONFIGS = {
    cpu: [1, 2, 4, 8, 16, 32],
    ram: [2, 4, 8, 16, 32, 64],
    disk: [25, 50, 100, 250, 500, 1000]
}

const PRESETS = [
    { name: 'Edge', cpu: 0, ram: 0, disk: 0, label: 'Light Loads' },
    { name: 'Pro', cpu: 2, ram: 2, disk: 2, label: 'Production' },
    { name: 'Beast', cpu: 4, ram: 4, disk: 4, label: 'Heavy Duty' }
]

export default function ServerBuilder() {
    const [cpu, setCpu] = useState(2)
    const [ram, setRam] = useState(2)
    const [disk, setDisk] = useState(2)

    // Smooth price animation state
    const [displayPrice, setDisplayPrice] = useState(0)

    const pricing = useMemo(() => {
        const cpuCost = CONFIGS.cpu[cpu] * 2
        const ramCost = CONFIGS.ram[ram] * 1.5
        const diskCost = (CONFIGS.disk[disk] / 25) * 1
        const total = 5 + cpuCost + ramCost + diskCost
        return { cpuCost, ramCost, diskCost, total }
    }, [cpu, ram, disk])

    // Animate price counter
    useEffect(() => {
        const timeout = setTimeout(() => {
            const diff = pricing.total - displayPrice
            if (Math.abs(diff) > 0.1) {
                setDisplayPrice(prev => prev + diff * 0.1)
            } else {
                setDisplayPrice(pricing.total)
            }
        }, 16)
        return () => clearTimeout(timeout)
    }, [pricing.total, displayPrice])

    const totalPower = useMemo(() => {
        const cpuProgress = cpu / (CONFIGS.cpu.length - 1)
        const ramProgress = ram / (CONFIGS.ram.length - 1)
        const diskProgress = disk / (CONFIGS.disk.length - 1)
        return (cpuProgress + ramProgress + diskProgress) / 3
    }, [cpu, ram, disk])

    const applyPreset = (preset) => {
        setCpu(preset.cpu)
        setRam(preset.ram)
        setDisk(preset.disk)
    }

    const ChipGroup = ({ label, values, current, onChange, unit }) => (
        <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-center text-xs">
                <span className="uppercase tracking-widest text-slate-500 font-bold">{label}</span>
                <span className="text-cyan-400 font-mono font-bold">{values[current]} {unit}</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {values.map((val, idx) => (
                    <button
                        key={idx}
                        onClick={() => onChange(idx)}
                        className={`py-2 text-xs font-mono rounded-lg transition-all border ${current === idx
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                            : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/30'
                            }`}
                    >
                        {val}
                    </button>
                ))}
            </div>
        </div>
    )

    return (
        <section className="py-16 md:py-24 lg:py-48 px-4 md:px-6 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 md:gap-24 items-center">
                <div className="order-1 lg:order-1 relative">
                    <div className="absolute -left-24 top-1/2 -translate-y-1/2 w-1 h-64 bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent hidden lg:block" />

                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight" style={{ hyphens: 'none' }}>
                        Orchestrate <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Elite Performance.</span>
                    </h2>
                    <p className="text-slate-400 text-base md:text-xl mb-8 md:mb-12 max-w-xl">
                        Select your power level. Our infrastructure scales with your ambition,
                        delivering sub-millisecond precision.
                    </p>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-3 md:gap-4 mb-8 md:mb-12">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.name}
                                onClick={() => applyPreset(preset)}
                                className="px-4 md:px-6 py-2 md:py-3 rounded-2xl glass border-white/10 hover:border-cyan-400/50 transition-all text-left group flex-1 min-w-[120px] md:min-w-[140px]"
                            >
                                <div className="text-[10px] uppercase tracking-tighter text-slate-500 group-hover:text-cyan-400 transition-colors">Preset</div>
                                <div className="text-base md:text-lg font-bold text-slate-200">{preset.name}</div>
                                <div className="text-xs text-slate-500">{preset.label}</div>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-6 md:space-y-10">
                        <ChipGroup label="Compute Clusters" values={CONFIGS.cpu} current={cpu} onChange={setCpu} unit="vCPUs" />
                        <ChipGroup label="Memory Capacity" values={CONFIGS.ram} current={ram} onChange={setRam} unit="GB RAM" />
                        <ChipGroup label="NVMe Storage" values={CONFIGS.disk} current={disk} onChange={setDisk} unit="GB" />

                        {/* Capability Gauge */}
                        <div className="space-y-3 pt-6">
                            <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-slate-500">
                                <span>Capability Gauge</span>
                                <span className="text-cyan-400">{Math.round(totalPower * 100)}% Load Capacity</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${totalPower * 100}%` }}
                                    transition={{ type: "spring", stiffness: 30 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="order-2 lg:order-2">
                    <TiltCard>
                        <div className="glass p-6 md:p-12 rounded-3xl md:rounded-[4rem] text-center relative overflow-hidden group border-white/10">
                            {/* Dynamic Background Glow */}
                            <motion.div
                                animate={{
                                    opacity: [0.3, 0.5, 0.3],
                                    scale: [1, 1.2, 1]
                                }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none"
                                style={{ opacity: 0.2 + totalPower * 0.4 }}
                            />

                            {/* Animated Server Core */}
                            <div className="relative mb-8 md:mb-12 flex justify-center h-48 md:h-64">
                                <motion.div
                                    animate={{
                                        y: [0, -15, 0],
                                    }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                    className="relative z-10 w-full h-full flex items-center justify-center p-4"
                                >
                                    <img
                                        src="/images/server-core.png"
                                        className="h-full w-auto rounded-3xl relative z-10 transition-all duration-700"
                                        style={{
                                            filter: `drop-shadow(0 0 ${20 + totalPower * 60}px rgba(34,211,238,${0.3 + totalPower * 0.4}))`,
                                            transform: `scale(${0.9 + totalPower * 0.2})`
                                        }}
                                        alt="Server Core"
                                    />

                                    {/* Particle effects density linked to power */}
                                    <AnimatePresence>
                                        {Array.from({ length: Math.floor(5 + totalPower * 15) }).map((_, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                                animate={{
                                                    opacity: [0, 0.8, 0],
                                                    scale: [0, 1, 0],
                                                    x: (Math.random() - 0.5) * 200,
                                                    y: (Math.random() - 0.5) * 200
                                                }}
                                                transition={{
                                                    duration: 2 + Math.random() * 3,
                                                    repeat: Infinity,
                                                    delay: Math.random() * 5
                                                }}
                                                className="absolute w-1 h-1 bg-cyan-400 rounded-full blur-[1px]"
                                            />
                                        ))}
                                    </AnimatePresence>
                                </motion.div>

                                {/* Deep Background Glow */}
                                <div className="absolute inset-0 bg-cyan-500/5 blur-[120px] rounded-full scale-110 pointer-events-none transition-all duration-700"
                                    style={{ transform: `scale(${1 + totalPower * 0.5})`, opacity: 0.1 + totalPower * 0.3 }}
                                />
                            </div>

                            <div className="relative z-10">
                                <p className="text-slate-500 uppercase tracking-[0.3em] text-[10px] font-black mb-3 md:mb-4" style={{ hyphens: 'none' }}>Real-Time Infrastructure Cost</p>
                                <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 md:mb-8 tracking-tighter flex justify-center items-start">
                                    <span className="text-xl sm:text-2xl md:text-3xl text-cyan-400 mt-1 md:mt-2 mr-1">$</span>
                                    <span>{displayPrice.toFixed(2)}</span>
                                </div>

                                {/* Cost Breakdown */}
                                <div className="flex flex-wrap justify-center gap-2 md:gap-4 text-[10px] font-mono text-slate-500 mb-6 md:mb-10 pb-6 md:pb-10 border-b border-white/5">
                                    <span>CPU: ${pricing.cpuCost.toFixed(0)}</span>
                                    <span className="opacity-30">|</span>
                                    <span>RAM: ${pricing.ramCost.toFixed(0)}</span>
                                    <span className="opacity-30">|</span>
                                    <span>NVMe: ${pricing.diskCost.toFixed(0)}</span>
                                </div>

                                <Link to="/dashboard" className="block w-full py-4 md:py-6 bg-white text-black text-base md:text-xl font-black rounded-2xl md:rounded-[2rem] hover:bg-cyan-400 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.3)]">
                                    Initialize Dashboard
                                </Link>
                                <p className="mt-4 md:mt-6 text-slate-500 text-xs font-medium opacity-50 uppercase tracking-widest">Prorated per-second billing</p>
                            </div>
                        </div>
                    </TiltCard>
                </div>
            </div>
        </section>
    )
}
