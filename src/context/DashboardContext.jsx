import { createContext, useContext, useState, useEffect } from 'react'

const DashboardContext = createContext()

const initialResources = [] // Empty by default as per user request

export function DashboardProvider({ children }) {
    const [resources, setResources] = useState(() => {
        const saved = localStorage.getItem('wys_resources')
        return saved ? JSON.parse(saved) : initialResources
    })

    const [balance, setBalance] = useState(() => {
        const saved = localStorage.getItem('wys_balance')
        return saved ? parseFloat(saved) : 0.00
    })

    useEffect(() => {
        localStorage.setItem('wys_resources', JSON.stringify(resources))
        localStorage.setItem('wys_balance', balance.toString())
    }, [resources, balance])

    const addResource = (resource) => {
        const newResource = {
            ...resource,
            id: Math.random().toString(36).substr(2, 9),
            status: 'Running', // Default to running
            uptime: 'Just now',
            ip: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        }
        setResources(prev => [newResource, ...prev])
    }

    const removeResource = (id) => {
        setResources(prev => prev.filter(r => r.id !== id))
    }

    const addFunds = (amount) => {
        setBalance(prev => prev + amount)
    }

    return (
        <DashboardContext.Provider value={{ resources, balance, addResource, removeResource, addFunds }}>
            {children}
        </DashboardContext.Provider>
    )
}

export function useDashboard() {
    return useContext(DashboardContext)
}
