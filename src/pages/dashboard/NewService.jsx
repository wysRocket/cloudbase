import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const serviceTypes = [
    { id: 'vps', name: 'Virtual Private Server', icon: 'server', description: 'High-performance NVMe VPS', price: 'From $5/mo' },
    { id: 'k8s', name: 'Kubernetes Cluster', icon: 'cubes', description: 'Managed K8s control plane', price: 'From $40/mo' },
    { id: 'db', name: 'Managed Database', icon: 'database', description: 'Postgres, MySQL, Redis', price: 'From $15/mo' },
    { id: 'gpu', name: 'GPU Instance', icon: 'chip', description: 'NVIDIA H100 / A100', price: 'From $2/hr' },
]

const regions = [
    { id: 'us-east', name: 'New York, USA', flag: '🇺🇸' },
    { id: 'us-west', name: 'San Francisco, USA', flag: '🇺🇸' },
    { id: 'eu-central', name: 'Frankfurt, DE', flag: '🇩🇪' },
    { id: 'eu-west', name: 'London, UK', flag: '🇬🇧' },
    { id: 'asia-east', name: 'Singapore, SG', flag: '🇸🇬' },
]

export default function NewService() {
    const navigate = useNavigate()
    const [selectedType, setSelectedType] = useState(serviceTypes[0].id)
    const [selectedRegion, setSelectedRegion] = useState(regions[0].id)
    const [isDeploying, setIsDeploying] = useState(false)

    const handleDeploy = () => {
        setIsDeploying(true)
        // Simulate API call
        setTimeout(() => {
            setIsDeploying(false)
            navigate('/dashboard')
        }, 2000)
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Deploy New Service</h1>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    {/* Service Type Selection */}
                    <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-4">1. Choose Service Type</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {serviceTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={`text-left p-4 rounded-xl border transition-all ${selectedType === type.id
                                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                                            : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-400 hover:text-white'
                                        }`}
                                >
                                    <div className="font-bold mb-1">{type.name}</div>
                                    <div className="text-xs opacity-70 mb-2">{type.description}</div>
                                    <div className="text-sm font-mono">{type.price}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Region Selection */}
                    <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-4">2. Select Region</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {regions.map((region) => (
                                <button
                                    key={region.id}
                                    onClick={() => setSelectedRegion(region.id)}
                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${selectedRegion === region.id
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

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6 sticky top-24">
                        <h2 className="text-xl font-bold mb-6">Summary</h2>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Service</span>
                                <span className="font-medium text-white">{serviceTypes.find(t => t.id === selectedType)?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Region</span>
                                <span className="font-medium text-white">{regions.find(r => r.id === selectedRegion)?.name}</span>
                            </div>
                            <div className="h-px bg-white/10 my-4"></div>
                            <div className="flex justify-between items-center text-lg font-bold text-white">
                                <span>Total</span>
                                <span className="text-cyan-400">{serviceTypes.find(t => t.id === selectedType)?.price}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleDeploy}
                            disabled={isDeploying}
                            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-600/50 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25 flex justify-center items-center gap-2"
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
