import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'

export default function Dashboard() {
    const { resources, balance } = useDashboard()

    // Derived stats
    const activeServices = resources.filter(r => r.status === 'Running').length

    const stats = [
        { title: 'Active Services', value: activeServices.toString(), change: resources.length > 0 ? 'Operational' : 'No services', trend: resources.length > 0 ? 'up' : 'neutral' },
        { title: 'Current Balance', value: `${balance.toFixed(2)} credits`, change: 'Available funds', trend: 'neutral' },
        { title: 'Total Bandwidth', value: '0 GB', change: '0% of quota', trend: 'neutral' },
        { title: 'System Status', value: 'Healthy', change: 'All systems operational', trend: 'good' },
    ]

    return (
        <>
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-10">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">Dashboard Overview</h1>
                    <p className="text-slate-400 text-sm md:text-base">Welcome back, here's what's happening with your infrastructure.</p>
                </div>
                <Link to="/dashboard/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center justify-center gap-2 text-sm md:text-base whitespace-nowrap">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Resource
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
                {stats.map((stat, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={stat.title}
                        className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-6 hover:bg-white/10 transition-all group min-h-[140px] flex flex-col"
                    >
                        <h3 className="text-slate-400 text-xs md:text-sm font-medium mb-3">{stat.title}</h3>
                        <div className="flex-1 flex flex-col justify-between gap-3">
                            <div className="text-xl md:text-2xl font-bold leading-tight">{stat.value}</div>
                            <div className={`text-xs px-2 py-1 rounded-full self-start max-w-full ${stat.trend === 'up' ? 'bg-cyan-500/10 text-cyan-400' :
                                stat.trend === 'good' ? 'bg-green-500/10 text-green-400' :
                                    'bg-slate-500/10 text-slate-400'
                                }`}>
                                {stat.change}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Active Resources Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#0f1629] border border-white/5 rounded-2xl overflow-hidden"
            >
                <div className="p-4 md:p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 className="text-lg md:text-xl font-bold">Active Resources</h2>
                    {resources.length > 0 && <Link to="/dashboard/services" className="text-sm text-cyan-400 hover:text-cyan-300">View All</Link>}
                </div>

                {resources.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No active resources</h3>
                        <p className="mb-6">Deploy your first service to get started.</p>
                        <Link to="/dashboard/new" className="text-cyan-400 hover:text-cyan-300 font-medium">Deploy New Service &rarr;</Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-slate-400">
                                <tr>
                                    <th className="p-4 font-medium pl-6">Name</th>
                                    <th className="p-4 font-medium">Type</th>
                                    <th className="p-4 font-medium">Region</th>
                                    <th className="p-4 font-medium">IP Address</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Uptime</th>
                                    <th className="p-4 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {resources.map((res) => (
                                    <tr key={res.id || res.name} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 pl-6 font-medium text-white">{res.name}</td>
                                        <td className="p-4 text-slate-400">{res.type}</td>
                                        <td className="p-4 text-slate-400">{res.region}</td>
                                        <td className="p-4 text-slate-400 font-mono text-xs">{res.ip}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${res.status === 'Running' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                    res.status === 'Updating' ? 'bg-yellow-500 animate-pulse' :
                                                        'bg-slate-500'
                                                    }`}></span>
                                                <span className={
                                                    res.status === 'Running' ? 'text-green-400' :
                                                        res.status === 'Updating' ? 'text-yellow-400' :
                                                            'text-slate-500'
                                                }>{res.status}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-400">{res.uptime}</td>
                                        <td className="p-4 text-right pr-6">
                                            <button className="text-slate-400 hover:text-white">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </>
    )
}
