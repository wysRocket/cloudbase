import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'

const serviceTypes = [
    { id: 'vps', name: 'Virtual Private Server', icon: 'server', description: 'High-performance NVMe VPS', price: '100 credits/mo', cost: 100, typeName: 'VPS (Standard)', serviceType: 'vps' },
    { id: 'k8s', name: 'Kubernetes Cluster', icon: 'cubes', description: 'Managed K8s control plane via DigitalOcean Kubernetes', price: '1000 credits/mo', cost: 1000, typeName: 'Kubernetes (Managed)', serviceType: 'kubernetes' },
    { id: 'db', name: 'Managed Database', icon: 'database', description: 'Postgres, MySQL, Redis', price: '300 credits/mo', cost: 300, typeName: 'Database (PG/MySQL)', serviceType: 'database' },
    { id: 'gpu', name: 'GPU Instance', icon: 'chip', description: 'NVIDIA H100 / A100', price: '50 credits/hr', cost: 50, typeName: 'GPU (H100)', serviceType: 'gpu' },
    { id: 'game', name: 'Game Server', icon: 'gamepad-2', description: 'Droplet + cloud-init bootstrap profile', price: '200 credits/mo', cost: 200, typeName: 'Game Server (Managed Bootstrap)', serviceType: 'gameServer' },
]

const gpuProfiles = {
    h100: { label: 'H100 80GB', dropletSize: 'gpu-h100x1-80gb', cpu: 16, ram: '120GB', vram: '80GB' },
    a100: { label: 'A100 80GB', dropletSize: 'gpu-a100x1-80gb', cpu: 12, ram: '96GB', vram: '80GB' },
}

const gameServerProfiles = {
    minecraft: { label: 'Minecraft', bootstrap: 'minecraft-papermc', cloudInit: 'bootstrap-minecraft.yml' },
    cs2: { label: 'Counter-Strike 2', bootstrap: 'cs2-dedicated', cloudInit: 'bootstrap-cs2.yml' },
}

const dbEngines = {
    postgres: { version: '16', port: 5432 },
    mysql: { version: '8.0', port: 3306 },
}

const regions = [
    { id: 'us-east', name: 'New York, USA', flag: '🇺🇸' },
    { id: 'us-west', name: 'San Francisco, USA', flag: '🇺🇸' },
    { id: 'eu-central', name: 'Frankfurt, DE', flag: '🇩🇪' },
    { id: 'eu-west', name: 'London, UK', flag: '🇬🇧' },
    { id: 'asia-east', name: 'Singapore, SG', flag: '🇸🇬' },
]

export default function NewService() {
    const navigate = useNavigate()
    const { addResource, balance, deductCredits } = useDashboard()
    const [selectedType, setSelectedType] = useState(serviceTypes[0].id)
    const [selectedRegion, setSelectedRegion] = useState(regions[0].id)
    const [selectedGpuProfile, setSelectedGpuProfile] = useState('h100')
    const [selectedDbEngine, setSelectedDbEngine] = useState('postgres')
    const [selectedGameProfile, setSelectedGameProfile] = useState('minecraft')
    const [isDeploying, setIsDeploying] = useState(false)
    const [deployError, setDeployError] = useState('')

    const selectedTypeInfo = serviceTypes.find(t => t.id === selectedType)
    const canDeploy = balance >= selectedTypeInfo.cost

    const handleDeploy = async () => {
        if (!canDeploy) return

        const regionInfo = regions.find(r => r.id === selectedRegion)
        setIsDeploying(true)
        setDeployError('')

        try {
            await deductCredits(`${selectedTypeInfo.typeName} deployment`, selectedTypeInfo.cost)
            addResource({
                name: `${selectedTypeInfo.id}-${Math.random().toString(36).substr(2, 5)}`,
                type: selectedTypeInfo.typeName,
                serviceType: selectedTypeInfo.serviceType,
                region: regionInfo.id,
                price: selectedTypeInfo.price,
                provider: 'digitalocean',
                providerPath: selectedTypeInfo.serviceType === 'vps' ? '/v2/droplets' : `/v2/${selectedTypeInfo.id}`,
                providerHandler: selectedTypeInfo.serviceType === 'kubernetes' ? 'digitalocean-kubernetes-provisioner' : 'digitalocean-service-provisioner',
                provisioning: {
                    kubernetes: selectedTypeInfo.serviceType === 'kubernetes' ? {
                        clusterName: `k8s-${Math.random().toString(36).slice(2, 8)}`,
                        nodePool: 's-4vcpu-8gb',
                        version: '1.31.x-do.2',
                        lifecycle: ['create-cluster', 'wait-control-plane', 'create-nodepool', 'sync-kubeconfig'],
                    } : null,
                    database: selectedTypeInfo.serviceType === 'database' ? {
                        engine: selectedDbEngine,
                        version: dbEngines[selectedDbEngine].version,
                        lifecycle: ['create-cluster', 'apply-user', 'create-default-db', 'sync-connection-info'],
                        connectionInfo: {
                            host: `${selectedDbEngine}-${Math.random().toString(36).slice(2, 8)}.db.cloudbase.internal`,
                            port: dbEngines[selectedDbEngine].port,
                            username: 'app_user',
                            database: 'app',
                            ssl: true,
                        },
                    } : null,
                    gpu: selectedTypeInfo.serviceType === 'gpu' ? {
                        profile: selectedGpuProfile,
                        ...gpuProfiles[selectedGpuProfile],
                    } : null,
                    gameServer: selectedTypeInfo.serviceType === 'gameServer' ? {
                        strategy: 'droplet-cloud-init-bootstrap',
                        profile: selectedGameProfile,
                        ...gameServerProfiles[selectedGameProfile],
                    } : null,
                },
            })
            navigate('/dashboard')
        } catch {
            setDeployError('Failed to deduct credits. Please try again.')
        } finally {
            setIsDeploying(false)
        }
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

                    {selectedType === 'gpu' && (
                        <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4">3. GPU Profile</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {Object.entries(gpuProfiles).map(([id, profile]) => (
                                    <button key={id} onClick={() => setSelectedGpuProfile(id)} className={`text-left p-4 rounded-xl border ${selectedGpuProfile === id ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-slate-400'}`}>
                                        <div className="font-bold">{profile.label}</div>
                                        <div className="text-xs opacity-70">{profile.dropletSize}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedType === 'db' && (
                        <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4">3. Database Engine</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {Object.keys(dbEngines).map((engine) => (
                                    <button key={engine} onClick={() => setSelectedDbEngine(engine)} className={`text-left p-4 rounded-xl border ${selectedDbEngine === engine ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-slate-400'}`}>
                                        <div className="font-bold uppercase">{engine}</div>
                                        <div className="text-xs opacity-70">v{dbEngines[engine].version}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedType === 'game' && (
                        <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4">3. Game Bootstrap Profile</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {Object.entries(gameServerProfiles).map(([id, profile]) => (
                                    <button key={id} onClick={() => setSelectedGameProfile(id)} className={`text-left p-4 rounded-xl border ${selectedGameProfile === id ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-slate-400'}`}>
                                        <div className="font-bold">{profile.label}</div>
                                        <div className="text-xs opacity-70">{profile.cloudInit}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Sidebar */}
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
                                <span className="font-medium text-white">{regions.find(r => r.id === selectedRegion)?.name}</span>
                            </div>
                            <div className="h-px bg-white/10 my-4"></div>
                            <div className="flex justify-between items-center text-lg font-bold text-white">
                                <span>Total</span>
                                <span className="text-cyan-400">{selectedTypeInfo.price}</span>
                            </div>
                        </div>

                        {!canDeploy && (
                            <p className="text-amber-400 text-sm mb-4">
                                Insufficient credits. Top up your balance to deploy this service.
                            </p>
                        )}

                        {deployError && (
                            <p className="text-red-400 text-sm mb-4">{deployError}</p>
                        )}

                        <button
                            onClick={handleDeploy}
                            disabled={isDeploying || !canDeploy}
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
