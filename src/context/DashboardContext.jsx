import { createContext, useContext, useState, useEffect } from 'react'

const DashboardContext = createContext()

const initialResources = [] // Empty by default as per user request

const initialTransactions = [
    { id: 'tx_2', date: '2026-01-15', description: 'Credits Purchase', amount: 5000, status: 'Completed', type: 'credit', currencyPaid: '£42.74', currency: 'GBP' },
    { id: 'tx_1', date: '2026-02-01', description: 'Monthly Subscription - Pro Plan', amount: -2900, status: 'Completed', type: 'debit', currencyPaid: '-', currency: null },
]

export function DashboardProvider({ children }) {
    const [resources, setResources] = useState(() => {
        const saved = localStorage.getItem('wys_resources')
        return saved ? JSON.parse(saved) : initialResources
    })

    const [transactions, setTransactions] = useState(() => {
        const saved = localStorage.getItem('wys_transactions')
        return saved ? JSON.parse(saved) : initialTransactions
    })

    // Calculate balance from transactions
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0)

    useEffect(() => {
        localStorage.setItem('wys_resources', JSON.stringify(resources))
        localStorage.setItem('wys_transactions', JSON.stringify(transactions))
    }, [resources, transactions])

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

    const addFunds = (amount, currencyAmount, currency) => {
        const newTransaction = {
            id: `tx_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            description: `Credits Purchase`,
            amount: amount,
            status: 'Completed',
            type: 'credit',
            currencyPaid: currencyAmount,
            currency: currency
        }
        setTransactions(prev => [newTransaction, ...prev])
    }

    const deductCredits = (amount, description) => {
        const newTransaction = {
            id: `tx_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            description: description,
            amount: -amount,
            status: 'Completed',
            type: 'debit'
        }
        setTransactions(prev => [newTransaction, ...prev])
    }

    return (
        <DashboardContext.Provider value={{ resources, balance, transactions, addResource, removeResource, addFunds, deductCredits }}>
            {children}
        </DashboardContext.Provider>
    )
}

export function useDashboard() {
    return useContext(DashboardContext)
}
