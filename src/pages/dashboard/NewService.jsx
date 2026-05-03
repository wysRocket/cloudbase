import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'
import { createServiceResource, deleteServiceResource, enqueueProvisionJob, getProviderQuote } from '../../lib/resellerApi'

const serviceTypes = [
  {
    id: 'vps', name: 'Virtual Private Server', description: 'High-performance NVMe VPS',
    fallbackPriceLabel: '1500 credits/mo', fallbackCost: 1500,
    typeName: 'VPS (Standard)', planCode: 'do-vps-basic-2vcpu-4gb',
    metadata: { sizeSlug: 's-2vcpu-4gb', imageSlug: 'ubuntu-22-04-x64' },
  },
  {
    id: 'k8s', name: 'Kubernetes Cluster', description: 'Managed K8s control plane',
    fallbackPriceLabel: '4500 credits/mo', fallbackCost: 4500,
    typeName: 'Kubernetes (Managed)', planCode: 'do-k8s-basic-3node',
    metadata: { nodeSize: 's-2vcpu-4gb', nodeCount: '3' },
  },
  {
    id: 'db', name: 'Managed Database', description: 'Postgres, MySQL, Redis',
    fallbackPriceLabel: '1900 credits/mo', fallbackCost: 1900,
    typeName: 'Database (PG/MySQL)', planCode: 'do-db-pg-basic',
    metadata: { engine: 'pg', version: '16', size: 'db-s-1vcpu-1gb' },
  },
  {
    id: 'gpu', name: 'GPU Instance', description: 'NVIDIA H100 / A100',
    fallbackPriceLabel: '350 credits/hr', fallbackCost: 350,
    typeName: 'GPU (H100)', planCode: 'do-gpu-h100-1x',
    metadata: { sizeSlug: 'gpu-h100x1-80gb' },
  },
  {
    id: 'game_server', name: 'Game Server', description: 'SteamCMD-ready Ubuntu droplet',
    fallbackPriceLabel: '1800 credits/mo', fallbackCost: 1800,
    typeName: 'Game Server', planCode: 'do-game-basic-2vcpu-4gb',
    metadata: { sizeSlug: 's-2vcpu-4gb' },
  },
]

const regions = [
  { id: 'nyc3', name: 'New York, USA', flag: '🇺🇸' },
  { id: 'sfo3', name: 'San Francisco, USA', flag: '🇺🇸' },
  { id: 'fra1', name: 'Frankfurt, DE', flag: '🇩🇪' },
  { id: 'lon1', name: 'London, UK', flag: '🇬🇧' },
  { id: 'sgp1', name: 'Singapore, SG', flag: '🇸🇬' },
]

function quoteLabel(quote, fallbackLabel) {
  if (!quote || quote.availability !== 'available') return fallbackLabel
  const cycle = quote.billingCycle === 'hourly' ? 'hr' : 'mo'
  return `${(quote.lineTotalCents || 0).toLocaleString()} credits/${cycle}`
}

export default function NewService() {
  const navigate = useNavigate()
  const { addResource, balance, refreshTransactions } = useDashboard()
  const [selectedType, setSelectedType] = useState(serviceTypes[0].id)
  const [selectedRegion, setSelectedRegion] = useState(regions[0].id)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')
  const [quote, setQuote] = useState(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)

  const selectedTypeInfo = useMemo(() => serviceTypes.find((t) => t.id === selectedType), [selectedType])
  const quoteCost = quote?.availability === 'available' ? (quote.lineTotalCents || 0) : selectedTypeInfo.fallbackCost
  const totalLabel = quoteLabel(quote, selectedTypeInfo.fallbackPriceLabel)
  const canDeploy = balance >= quoteCost

  useEffect(() => {
    let active = true
    async function loadQuote() {
      setIsLoadingQuote(true)
      setDeployError('')
      try {
        const nextQuote = await getProviderQuote({
          planCode: selectedTypeInfo.planCode,
          region: selectedRegion,
          quantity: 1,
        })
        if (active) setQuote(nextQuote)
      } catch {
        if (active) setQuote(null)
      } finally {
        if (active) setIsLoadingQuote(false)
      }
    }
    loadQuote()
    return () => {
      active = false
    }
  }, [selectedRegion, selectedTypeInfo])

  const handleDeploy = async () => {
    if (!canDeploy) return

    const regionInfo = regions.find((r) => r.id === selectedRegion)
    setIsDeploying(true)
    setDeployError('')

    try {
      const resourceName = `${selectedTypeInfo.id}-${crypto.randomUUID().slice(0, 8)}`

      const serviceTypeMap = { k8s: 'kubernetes', db: 'database' }
      const resolvedServiceType = serviceTypeMap[selectedTypeInfo.id] || selectedTypeInfo.id

      const resource = await createServiceResource({
        serviceType: resolvedServiceType,
        displayName: resourceName,
        region: regionInfo.id,
        metadata: {
          planCode: selectedTypeInfo.planCode,
          ...selectedTypeInfo.metadata,
        },
      })

      try {
        await enqueueProvisionJob({ resourceId: resource.id })
      } catch (err) {
        // Remove the orphaned pending resource so the user isn't left with
        // a stuck entry that has no provision job behind it.
        await deleteServiceResource(resource.id).catch(() => {})
        throw err
      }

      // Refresh the balance/transaction list so the debit shows immediately.
      await refreshTransactions()

      addResource({
        id: resource.id,
        name: resourceName,
        type: selectedTypeInfo.typeName,
        region: regionInfo.id,
        price: totalLabel,
        status: 'Provisioning',
      })

      navigate('/dashboard')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('Insufficient credit')) {
        setDeployError('Insufficient credit balance. Please top up and try again.')
      } else {
        setDeployError('Failed to create provisioning job. Please try again.')
      }
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
          Deploy <span className="text-cyan-400">Resource</span>
        </h1>
        <p className="text-slate-400">Configure and launch your global infrastructure in seconds.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 space-y-12">
          {/* Section 1: Service Type */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold border border-cyan-500/30">1</span>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider text-sm">Choose Service Type</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {serviceTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`group relative text-left p-6 rounded-3xl border transition-all duration-500 overflow-hidden ${
                    selectedType === type.id
                      ? 'bg-cyan-500/5 border-cyan-500/50 shadow-[0_20px_50px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-slate-400 hover:text-white'
                  }`}
                >
                  {/* Subtle Background Glow for Selected */}
                  {selectedType === type.id && (
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none animate-pulse"></div>
                  )}

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl transition-colors duration-500 ${
                        selectedType === type.id ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-slate-500 group-hover:text-white'
                      }`}>
                        {type.id === 'vps' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>}
                        {type.id === 'k8s' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>}
                        {type.id === 'db' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.58 4 8 4s8-1.79 8-4M4 7c0-2.21 3.58-4 8-4s8 1.79 8 4m0 5c0 2.21-3.58 4-8 4s-8-1.79-8-4"></path></svg>}
                        {type.id === 'gpu' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>}
                        {type.id === 'game_server' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12h.01M10 12h.01M15 13h.01M18 11h.01M7.5 16h9a4.5 4.5 0 004.39-5.5l-.62-2.7A3 3 0 0017.35 5.5H6.65A3 3 0 003.73 7.8l-.62 2.7A4.5 4.5 0 007.5 16z"></path></svg>}
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-colors ${
                        selectedType === type.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-600'
                      }`}>
                        Available
                      </div>
                    </div>
                    
                    <h3 className={`text-xl font-bold mb-1 transition-colors ${selectedType === type.id ? 'text-white' : 'text-slate-300'}`}>
                      {type.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 line-clamp-2 leading-relaxed">{type.description}</p>
                    
                    <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest mb-1">Starting at</span>
                        <span className={`text-lg font-black ${selectedType === type.id ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {type.fallbackPriceLabel}
                        </span>
                      </div>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        selectedType === type.id ? 'bg-cyan-500 text-white scale-110' : 'bg-white/5 text-slate-700 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Section 2: Region Selection */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold border border-cyan-500/30">2</span>
              <h2 className="text-xl font-bold text-white uppercase tracking-wider text-sm">Select Deployment Region</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                    selectedRegion === region.id
                      ? 'bg-cyan-500/5 border-cyan-500/50 text-white shadow-[0_10px_30px_rgba(6,182,212,0.1)]'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`text-3xl transition-transform duration-500 ${selectedRegion === region.id ? 'scale-110' : 'grayscale group-hover:grayscale-0 group-hover:scale-105'}`}>
                    {region.flag}
                  </span>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-bold text-sm tracking-tight truncate w-full">{region.name.split(',')[0]}</span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{region.name.split(',')[1]?.trim() || 'Global'}</span>
                  </div>
                  
                  {selectedRegion === region.id && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: Summary */}
        <aside className="lg:w-96">
          <div className="sticky top-24">
            <div className="bg-[#0f1629] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
              {/* Subtle glass effect highlight */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
              
              <h2 className="text-2xl font-black text-white mb-8 tracking-tighter">Order <span className="text-cyan-400">Summary</span></h2>

              <div className="space-y-8 mb-10">
                <div className="group">
                  <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 mb-2 group-hover:text-cyan-500/50 transition-colors">Resource Type</div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-cyan-500/20 rounded-full overflow-hidden">
                      <div className="w-full h-1/2 bg-cyan-400 animate-pulse"></div>
                    </div>
                    <div className="font-black text-xl text-white tracking-tight leading-none truncate">
                      {selectedTypeInfo.name}
                    </div>
                  </div>
                </div>

                <div className="group">
                  <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 mb-2 group-hover:text-cyan-500/50 transition-colors">Target Location</div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-white/5 rounded-full"></div>
                    <div className="font-black text-xl text-white tracking-tight leading-none truncate">
                      {regions.find((r) => r.id === selectedRegion)?.name}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-600 mb-4">Pricing Model</div>
                  <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                    <div className="flex justify-between items-end gap-4">
                      <span className="text-slate-400 font-bold text-sm">Monthly Rate</span>
                      <div className="text-right">
                        {isLoadingQuote ? (
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                          </div>
                        ) : (
                          <span className="text-3xl font-black text-cyan-400 tracking-tighter">{totalLabel}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              <div className="space-y-3 mb-8 min-h-[40px]">
                {quote && quote.availability === 'unavailable' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <span>Unavailable in selected region.</span>
                  </div>
                )}

                {!canDeploy && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>Low balance. Top up to continue.</span>
                  </div>
                )}
                
                {deployError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-bold">
                    {deployError}
                  </div>
                )}
              </div>

              <button
                onClick={handleDeploy}
                disabled={isDeploying || isLoadingQuote || !canDeploy || (quote && quote.availability === 'unavailable')}
                className="group relative w-full py-6 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-black rounded-[2rem] font-black text-lg transition-all duration-500 overflow-hidden shadow-[0_20px_40px_rgba(6,182,212,0.3)] hover:shadow-[0_25px_50px_rgba(6,182,212,0.4)] active:scale-95"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {isDeploying ? (
                    <>
                      <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin"></div>
                      <span>PROVISIONING...</span>
                    </>
                  ) : (
                    <>
                      <span>DEPLOY RESOURCE</span>
                      <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                    </>
                  )}
                </div>
                
                {/* Button Shine Animation */}
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
              </button>
              
              <p className="text-center text-[10px] text-slate-600 mt-6 font-bold uppercase tracking-widest">Instant activation • No hidden fees</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
