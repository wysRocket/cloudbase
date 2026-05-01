import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'

const statusClasses = {
    created: 'text-cyan-300',
    ready: 'text-green-400',
    degraded: 'text-amber-400',
    failed: 'text-red-400',
}

export default function ResourceList({ typeFilter, title }) {
    const { resources } = useDashboard()

    const filteredResources = typeFilter
        ? resources.filter(r => r.type.toLowerCase().includes(typeFilter.toLowerCase()))
        : resources

    return (
        <>
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{title}</h1>
                    <p className="text-slate-400">Manage your {title.toLowerCase()} and deployments.</p>
                </div>
                <Link to="/dashboard/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Resource
                </Link>
            </div>

            <div className="bg-[#0f1629] border border-white/5 rounded-2xl overflow-hidden">
                {filteredResources.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-slate-400">
                                <tr>
                                    <th className="p-4 font-medium pl-6">Name</th>
                                    <th className="p-4 font-medium">Region</th>
                                    <th className="p-4 font-medium">IP Address</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Timeout</th>
                                    <th className="p-4 font-medium">Masked Outputs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredResources.map((res) => (
                                    <tr key={res.id} className="hover:bg-white/5 transition-colors align-top">
                                        <td className="p-4 pl-6 font-medium text-white">{res.name}</td>
                                        <td className="p-4 text-slate-400">{res.region}</td>
                                        <td className="p-4 text-slate-400 font-mono text-xs">{res.ip}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${res.status === 'failed' ? 'bg-red-500' : res.status === 'degraded' ? 'bg-amber-500' : res.status === 'ready' ? 'bg-green-500' : 'bg-cyan-500'}`}></span>
                                                <span className={statusClasses[res.status] || 'text-slate-300'}>{res.status}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-400">{Math.round((res.readiness?.timeoutMs || 0) / 1000)}s</td>
                                        <td className="p-4 text-xs text-slate-400">
                                            {res.postProvision?.masked
                                                ? Object.entries(res.postProvision.masked).map(([key, value]) => (
                                                    <div key={key}><span className="text-slate-500">{key}:</span> {value}</div>
                                                ))
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}
