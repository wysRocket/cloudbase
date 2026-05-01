import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'
import { createServiceResource, enqueueProvisionJob, getProviderQuote } from '../../lib/resellerApi'

const serviceTypes = [
  { id: 'vps', name: 'Virtual Private Server', description: 'High-performance NVMe VPS', fallbackPriceLabel: '100 credits/mo', fallbackCost: 100, typeName: 'VPS (Standard)', planCode: 'do-vps-basic-2vcpu-4gb' },
  { id: 'k8s', name: 'Kubernetes Cluster', description: 'Managed K8s control plane', fallbackPriceLabel: '1000 credits/mo', fallbackCost: 1000, typeName: 'Kubernetes (Managed)', planCode: 'do-k8s-basic-3node' },
  { id: 'db', name: 'Managed Database', description: 'Postgres, MySQL, Redis', fallbackPriceLabel: '300 credits/mo', fallbackCost: 300, typeName: 'Database (PG/MySQL)', planCode: 'do-db-pg-basic' },
  { id: 'gpu', name: 'GPU Instance', description: 'NVIDIA H100 / A100', fallbackPriceLabel: '50 credits/hr', fallbackCost: 50, typeName: 'GPU (H100)', planCode: 'do-gpu-l40s-1x' },
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
  const amount = (Number(quote.lineTotalCents || 0) / 100).toFixed(2)
  return `$${amount}/${quote.billingCycle || 'monthly'}`
}

export default function NewService() {
  const navigate = useNavigate()
  const { addResource, balance, deductCredits } = useDashboard()
  const [selectedType, setSelectedType] = useState(serviceTypes[0].id)
  const [selectedRegion, setSelectedRegion] = useState(regions[0].id)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState('')
  const [quote, setQuote] = useState(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)

  const selectedTypeInfo = useMemo(() => serviceTypes.find((t) => t.id === selectedType), [selectedType])
  const quoteCost = quote?.availability === 'available' ? Math.ceil((quote.lineTotalCents || 0) / 100) : selectedTypeInfo.fallbackCost
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
      await deductCredits(`${selectedTypeInfo.typeName} deployment`, quoteCost)

      const resource = await createServiceResource({
        serviceType: selectedTypeInfo.id === 'k8s' ? 'kubernetes' : selectedTypeInfo.id === 'db' ? 'database' : selectedTypeInfo.id,
        displayName: resourceName,
        region: regionInfo.id,
        metadata: {
          planCode: selectedTypeInfo.planCode,
          sizeSlug: selectedTypeInfo.id === 'vps' ? 's-1vcpu-2gb' : undefined,
          imageSlug: selectedTypeInfo.id === 'vps' ? 'ubuntu-22-04-x64' : undefined,
        },
      })

      await enqueueProvisionJob({ resourceId: resource.id })

      addResource({
        id: resource.id,
        name: resourceName,
        type: selectedTypeInfo.typeName,
        region: regionInfo.id,
        price: totalLabel,
        status: 'Provisioning',
      })

      navigate('/dashboard')
    } catch {
      setDeployError('Failed to create provisioning job. Please try again.')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Deploy New Service</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">1. Choose Service Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {serviceTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedType === type.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold mb-1">{type.name}</div>
                  <div className="text-xs opacity-70 mb-2">{type.description}</div>
                  <div className="text-sm font-mono">{type.fallbackPriceLabel}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">2. Select Region</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {regions.map((region) => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    selectedRegion === region.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-2xl">{region.flag}</span>
                  <span className="font-medium text-sm">{region.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6">Summary</h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Service</span>
                <span className="font-medium text-white">{selectedTypeInfo.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Region</span>
                <span className="font-medium text-white">{regions.find((r) => r.id === selectedRegion)?.name}</span>
              </div>
              <div className="h-px bg-white/10 my-4"></div>
              <div className="flex justify-between items-center text-lg font-bold text-white">
                <span>Total</span>
                <span className="text-cyan-400">{isLoadingQuote ? 'Loading quote…' : totalLabel}</span>
              </div>
            </div>

            {quote && quote.availability === 'unavailable' && (
              <p className="text-amber-400 text-sm mb-4">This plan is unavailable in the selected region.</p>
            )}

            {!canDeploy && <p className="text-amber-400 text-sm mb-4">Insufficient credits. Top up your balance to deploy this service.</p>}
            {deployError && <p className="text-red-400 text-sm mb-4">{deployError}</p>}

            <button
              onClick={handleDeploy}
              disabled={isDeploying || isLoadingQuote || !canDeploy || (quote && quote.availability === 'unavailable')}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25 flex justify-center items-center gap-2"
            >
              {isDeploying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Deploying...
                </>
              ) : (
                <>Deploy Resource</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
