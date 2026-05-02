import { useState } from "react"
import { Link } from "react-router-dom"
import { useDashboard } from "../../context/DashboardContext"
import { requestLifecycleAction, syncResourceStatus } from "../../lib/resellerApi"

function statusClasses(status) {
  const normalized = String(status || "").toLowerCase()
  if (["active", "running", "succeeded"].includes(normalized)) return "bg-green-500 text-green-400"
  if (["pending", "provisioning", "processing", "queued"].includes(normalized)) return "bg-amber-500 text-amber-400"
  if (["failed", "dead_letter", "deleted"].includes(normalized)) return "bg-red-500 text-red-400"
  if (["suspended"].includes(normalized)) return "bg-slate-500 text-slate-300"
  return "bg-cyan-500 text-cyan-400"
}

export default function ResourceList({ typeFilter, title }) {
  const { resources, resourceEvents, refreshResources, refreshResourceEvents } = useDashboard()
  const [actionState, setActionState] = useState({})
  const [actionError, setActionError] = useState({})

  const filteredResources = typeFilter
    ? resources.filter((r) => r.type.toLowerCase().includes(typeFilter.toLowerCase()))
    : resources


  async function runAction(resourceId, action) {
    setActionState((prev) => ({ ...prev, [resourceId + ":" + action]: true }))
    setActionError((prev) => ({ ...prev, [resourceId]: "" }))
    try {
      await requestLifecycleAction({ resourceId, action })
      await refreshResources()
      await refreshResourceEvents()
    } catch (error) {
      setActionError((prev) => ({ ...prev, [resourceId]: error instanceof Error ? error.message : "Action failed." }))
    } finally {
      setActionState((prev) => ({ ...prev, [resourceId + ":" + action]: false }))
    }
  }

  async function runSync(resourceId) {
    setActionState((prev) => ({ ...prev, [resourceId + ":sync"]: true }))
    setActionError((prev) => ({ ...prev, [resourceId]: "" }))
    try {
      await syncResourceStatus({ resourceId })
      await refreshResources()
      await refreshResourceEvents()
    } catch (error) {
      setActionError((prev) => ({ ...prev, [resourceId]: error instanceof Error ? error.message : "Sync failed." }))
    } finally {
      setActionState((prev) => ({ ...prev, [resourceId + ":sync"]: false }))
    }
  }

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
          <div className="p-12 text-center text-slate-400">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No {title.toLowerCase()} found</h3>
            <p className="mb-6">You don"t have any {title.toLowerCase()} in this region.</p>
            <Link to="/dashboard/new" className="text-cyan-400 hover:text-cyan-300 font-medium">Deploy Now &rarr;</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400">
                <tr>
                  <th className="p-4 font-medium pl-6">Name</th>
                  <th className="p-4 font-medium">Region</th>
                  <th className="p-4 font-medium">IP Address</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredResources.map((res) => {
                  const [dotClass, textClass] = statusClasses(res.status).split(" ")
                  return (
                    <tr key={res.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 pl-6 font-medium text-white">{res.name}</td>
                      <td className="p-4 text-slate-400">{res.region}</td>
                      <td className="p-4 text-slate-400 font-mono text-xs">{res.ip}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
                          <div className="flex flex-col">
                          <span className={textClass}>{res.status}</span>
                          {resourceEvents?.[res.id]?.event_type && (
                            <span className="text-[11px] text-slate-500">{resourceEvents[res.id].event_type}</span>
                          )}
                        </div>
                        </div>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button onClick={() => runAction(res.id, "suspend")} disabled={actionState[res.id + ":suspend"]} className="text-xs px-2 py-1 rounded bg-white/5 text-amber-300 disabled:opacity-50">Suspend</button>
                          <button onClick={() => runAction(res.id, "resume")} disabled={actionState[res.id + ":resume"]} className="text-xs px-2 py-1 rounded bg-white/5 text-green-300 disabled:opacity-50">Resume</button>
                          <button onClick={() => runAction(res.id, "delete")} disabled={actionState[res.id + ":delete"]} className="text-xs px-2 py-1 rounded bg-white/5 text-red-300 disabled:opacity-50">Delete</button>
                          <button onClick={() => runSync(res.id)} disabled={actionState[res.id + ":sync"]} className="text-xs px-2 py-1 rounded bg-white/5 text-cyan-300 disabled:opacity-50">Sync</button>
                        </div>
                        {actionError[res.id] && <p className="text-[11px] text-red-400 mt-1">{actionError[res.id]}</p>}
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
