import { motion } from 'framer-motion'

export default function LiveStatus() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-help group"
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-300">
                All Systems <span className="text-green-400">Operational</span>
            </span>

            {/* Tooltip on hover */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-white/10 p-3 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-2xl z-50">
                <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-slate-500">Live Services</span>
                    <span className="text-[10px] text-green-400 font-bold">12,432</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 w-[98%]"></div>
                </div>
            </div>
        </motion.div>
    )
}
