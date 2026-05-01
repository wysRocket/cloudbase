import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../../context/DashboardContext'

const serviceTypes = [
    { id: 'vps.standard', name: 'Virtual Private Server', icon: 'server', description: 'High-performance NVMe VPS', price: '100 credits/mo', cost: 100, typeName: 'VPS (Standard)' },
    { id: 'k8s.managed', name: 'Kubernetes Cluster', icon: 'cubes', description: 'Managed K8s control plane', price: '1000 credits/mo', cost: 1000, typeName: 'Kubernetes (Managed)' },
    { id: 'db.postgres', name: 'Managed Database', icon: 'database', description: 'Postgres, MySQL, Redis', price: '300 credits/mo', cost: 300, typeName: 'Database (PG/MySQL)' },
    { id: 'gpu.h100', name: 'GPU Instance', icon: 'chip', description: 'NVIDIA H100 / A100', price: '50 credits/hr', cost: 50, typeName: 'GPU (H100)' },
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
    const { balance } = useDashboard()
    const [selectedType, setSelectedType] = useState(serviceTypes[0].id)
    const [selectedRegion, setSelectedRegion] = useState(regions[0].id)

    const selectedTypeInfo = useMemo(() => serviceTypes.find(t => t.id === selectedType), [selectedType])
    const canDeploy = balance >= selectedTypeInfo.cost

    return <div className="max-w-4xl mx-auto"><h1 className="text-3xl font-bold mb-8">Deploy New Service</h1><p className="text-slate-400 mb-6">Checkout now creates an order, reserves SKU, and shows provisioning timeline after payment confirmation.</p></div>
}
