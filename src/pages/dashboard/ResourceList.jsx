import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function ResourceList({ title }) {
    const [jobs, setJobs] = useState([])

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('provision_jobs')
                .select('id, status, attempts, max_attempts, updated_at, last_error, order_items(sku, region), provision_events(status, message, created_at)')
                .order('created_at', { ascending: false })
                .limit(30)
            setJobs(data || [])
        }
        load()
    }, [])

    return (
        <>
            <div className="flex justify-between items-end mb-10"><h1 className="text-3xl font-bold mb-2">{title}</h1><Link to="/dashboard/new" className="text-cyan-400">New Resource</Link></div>
            <div className="space-y-4">
                {jobs.map((job) => (
                    <div key={job.id} className="bg-[#0f1629] border border-white/5 rounded-2xl p-5">
                        <div className="flex justify-between text-sm"><div className="text-white">{job.order_items?.sku} · {job.order_items?.region}</div><div className={job.status === 'failed' ? 'text-red-400' : job.status === 'retrying' ? 'text-amber-400' : 'text-cyan-400'}>{job.status}</div></div>
                        <div className="text-xs text-slate-400 mt-2">Attempts: {job.attempts}/{job.max_attempts}</div>
                        {job.last_error && <div className="text-xs text-red-300 mt-2">{job.last_error}</div>}
                        <div className="mt-3 space-y-1">
                            {(job.provision_events || []).slice(0, 4).map((evt, idx) => <div key={idx} className="text-xs text-slate-300">• {evt.status}: {evt.message}</div>)}
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}
