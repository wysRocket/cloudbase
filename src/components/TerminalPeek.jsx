import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LOGS = [
    { type: 'info', msg: 'Initializing deployment sequence...' },
    { type: 'info', msg: 'Allocating NVMe resources in Frankfurt-01...' },
    { type: 'success', msg: 'Storage volume attached successfuly.' },
    { type: 'info', msg: 'Configuring isolated virtual network (VPC)...' },
    { type: 'info', msg: 'Pulling Docker image: registry.wyscloud.io/app:latest' },
    { type: 'success', msg: 'Image pulled (842MB) in 1.4s' },
    { type: 'info', msg: 'Starting health checks...' },
    { type: 'success', msg: 'Application is LIVE at app-7a8f.wyscloud.net' },
    { type: 'warning', msg: 'CPU usage spike detected: 82% - Scaling node...' },
    { type: 'success', msg: 'Horizontal autoscaling complete. 3 nodes active.' },
]

export default function TerminalPeek() {
    const [visibleLogs, setVisibleLogs] = useState([])
    const containerRef = useRef(null)

    useEffect(() => {
        let i = 0
        const interval = setInterval(() => {
            setVisibleLogs(prev => [...prev, LOGS[i]].slice(-6))
            i = (i + 1) % LOGS.length
        }, 2000)

        return () => clearInterval(interval)
    }, [])

    return (
        <div className="bg-black/80 rounded-2xl border border-white/10 p-6 font-mono text-sm h-full flex flex-col shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>

            {/* Terminal Header */}
            <div className="flex gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                <span className="text-[10px] text-slate-600 ml-2 uppercase tracking-widest">deployment-live-log</span>
            </div>

            <div className="flex-1 space-y-1 overflow-hidden" ref={containerRef}>
                <AnimatePresence mode="popLayout">
                    {visibleLogs.map((log, i) => (
                        <motion.div
                            key={`${log.msg}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex gap-3"
                        >
                            <span className="text-slate-700">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                            <span className={
                                log.type === 'success' ? 'text-green-400' :
                                    log.type === 'warning' ? 'text-yellow-400' : 'text-cyan-400'
                            }>
                                {log.type === 'success' ? '✔' : log.type === 'warning' ? '⚠' : '>'}
                            </span>
                            <span className="text-slate-300">{log.msg}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 background-size-[100%_2px,3px_100%]"></div>
        </div>
    )
}
