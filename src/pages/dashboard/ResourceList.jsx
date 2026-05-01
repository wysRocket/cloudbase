import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'
import { supabase } from '../../lib/supabaseClient'

const lifecycleActions = {
    running: ['Suspend', 'Delete'],
    suspended: ['Resume', 'Delete'],
    deleted: [],
    deleting: [],
}

const statusColor = (status) => {
    const normalized = (status || '').toLowerCase()
    if (normalized === 'running') return 'text-green-400 bg-green-500'
    if (normalized === 'suspended') return 'text-amber-400 bg-amber-500'
    if (normalized === 'deleting' || normalized === 'deleted') return 'text-rose-400 bg-rose-500'
    if (normalized.includes('provision') || normalized.includes('pending')) return 'text-cyan-400 bg-cyan-500'
    return 'text-slate-300 bg-slate-500'
}

export default function ResourceList({ typeFilter, title }) {
    const { resources } = useDashboard()
    const [resourceState, setResourceState] = useState(resources)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [rowPendingAction, setRowPendingAction] = useState({})
    const [rowErrors, setRowErrors] = useState({})
    const [eventsByResource, setEventsByResource] = useState({})

    useEffect(() => {
        setResourceState(resources)
    }, [resources])

    const filteredResources = useMemo(() => (typeFilter
        ? resourceState.filter(r => r.type.toLowerCase().includes(typeFilter.toLowerCase()))
        : resourceState), [resourceState, typeFilter])

    const refreshProviderState = useCallback(async () => {
        const ids = resourceState.map(r => r.id).filter((id) => typeof id === 'string' && !id.includes('_'))
        if (ids.length === 0) return

        setIsRefreshing(true)
        try {
            const [{ data: remoteResources, error: resourceError }, { data: events, error: eventsError }] = await Promise.all([
                supabase.from('resources').select('id, status, provider_status, updated_at, ip').in('id', ids),
                supabase.from('provision_events').select('resource_id, event_type, message, created_at, status').in('resource_id', ids).order('created_at', { ascending: false }).limit(50),
            ])

            if (resourceError) throw resourceError
            if (eventsError) throw eventsError

            if (remoteResources?.length) {
                const remoteMap = new Map(remoteResources.map((r) => [String(r.id), r]))
                setResourceState((prev) => prev.map((res) => {
                    const remote = remoteMap.get(String(res.id))
                    if (!remote) return res
                    return {
                        ...res,
                        status: remote.provider_status || remote.status || res.status,
                        ip: remote.ip || res.ip,
                        updatedAt: remote.updated_at,
                    }
                }))
            }

            const grouped = (events || []).reduce((acc, event) => {
                const key = String(event.resource_id)
                acc[key] = acc[key] || []
                acc[key].push(event)
                return acc
            }, {})
            setEventsByResource(grouped)
        } catch (error) {
            console.warn('Unable to sync provider state.', error)
        } finally {
            setIsRefreshing(false)
        }
    }, [resourceState])

    useEffect(() => {
        refreshProviderState()
        const timer = setInterval(refreshProviderState, 20000)
        return () => clearInterval(timer)
    }, [refreshProviderState])

    const runLifecycleAction = async (resource, action) => {
        const actionLower = action.toLowerCase()
        setRowPendingAction((prev) => ({ ...prev, [resource.id]: actionLower }))
        setRowErrors((prev) => ({ ...prev, [resource.id]: '' }))

        try {
            const id = String(resource.id)
            if (id.includes('_')) {
                throw new Error('Resource is local-only. Redeploy from backend-backed flow to manage lifecycle.')
            }

            const { error } = await supabase
                .from('resources')
                .update({ desired_state: actionLower })
                .eq('id', resource.id)

            if (error) throw error
            await refreshProviderState()
        } catch (error) {
            setRowErrors((prev) => ({ ...prev, [resource.id]: error.message || `Failed to ${actionLower}` }))
        } finally {
            setRowPendingAction((prev) => ({ ...prev, [resource.id]: '' }))
        }
    }

    return (
        <>
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-bold mb-2">{title}</h1>
                    <p className="text-slate-400">Manage your {title.toLowerCase()} and deployments.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={refreshProviderState} disabled={isRefreshing} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-60">
                        {isRefreshing ? 'Syncing…' : 'Sync status'}
                    </button>
                    <Link to="/dashboard/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Resource
                    </Link>
                </div>
            </div>

            <div className="bg-[#0f1629] border border-white/5 rounded-2xl overflow-hidden">
                {filteredResources.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <h3 className="text-lg font-medium text-white mb-2">No {title.toLowerCase()} found</h3>
                        <p className="mb-6">You don't have any {title.toLowerCase()} in this region.</p>
                        <Link to="/dashboard/new" className="text-cyan-400 hover:text-cyan-300 font-medium">Deploy Now &rarr;</Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-slate-400">
                                <tr><th className="p-4 font-medium pl-6">Name</th><th className="p-4 font-medium">Region</th><th className="p-4 font-medium">IP Address</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium">Job timeline</th><th className="p-4 font-medium text-right pr-6">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredResources.map((res) => {
                                    const status = res.status || 'Unknown'
                                    const actions = lifecycleActions[(status || '').toLowerCase()] || ['Suspend', 'Resume', 'Delete']
                                    const pending = rowPendingAction[res.id]
                                    const error = rowErrors[res.id]
                                    const events = eventsByResource[String(res.id)] || []
                                    const [statusTextColor, dotColor] = statusColor(status).split(' ')
                                    return (
                                        <tr key={res.id} className="hover:bg-white/5 transition-colors align-top">
                                            <td className="p-4 pl-6 font-medium text-white">{res.name}</td>
                                            <td className="p-4 text-slate-400">{res.region}</td>
                                            <td className="p-4 text-slate-400 font-mono text-xs">{res.ip}</td>
                                            <td className="p-4"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${dotColor}`}></span><span className={statusTextColor}>{status}</span></div></td>
                                            <td className="p-4 text-xs text-slate-300 max-w-xs">
                                                {events.length === 0 ? <span className="text-slate-500">No timeline yet</span> : (
                                                    <ul className="space-y-1">
                                                        {events.slice(0, 3).map((event, idx) => (
                                                            <li key={`${event.created_at}-${idx}`}>
                                                                <span className="text-slate-500 mr-2">{new Date(event.created_at).toLocaleTimeString()}</span>
                                                                <span>{event.message || event.event_type || event.status}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex justify-end gap-2 flex-wrap">
                                                    {actions.map((action) => (
                                                        <button key={action} onClick={() => runLifecycleAction(res, action)} disabled={Boolean(pending)} className="text-cyan-400 hover:text-cyan-300 disabled:text-slate-500">
                                                            {pending === action.toLowerCase() ? `${action}…` : action}
                                                        </button>
                                                    ))}
                                                </div>
                                                {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}
