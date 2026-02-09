import { motion } from 'framer-motion'
import { useDashboard } from '../../context/DashboardContext'

export default function Billing() {
    const { balance, addFunds } = useDashboard()

    const transactions = [
        { id: 'tx_1', date: '2026-02-01', description: 'Monthly Subscription - Pro Plan', amount: -29.00, status: 'Completed' },
        { id: 'tx_2', date: '2026-01-15', description: 'Credit Deposit', amount: 50.00, status: 'Completed' },
    ]

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Billing & Payments</h1>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-8">
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Current Balance</h3>
                    <div className="text-4xl font-bold text-white mb-6">${balance.toFixed(2)}</div>
                    <button
                        onClick={() => addFunds(25)}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25"
                    >
                        Add Funds (+$25.00)
                    </button>
                </div>

                <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-8">
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Active Plan</h3>
                    <div className="text-2xl font-bold text-white mb-1">Pro Plan</div>
                    <p className="text-slate-400 text-sm mb-6">$29.00 / month</p>
                    <button className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                        Change Plan &rarr;
                    </button>
                </div>
            </div>

            <div className="bg-[#0f1629] border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold">Transaction History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-slate-400">
                            <tr>
                                <th className="p-4 font-medium pl-6">Date</th>
                                <th className="p-4 font-medium">Description</th>
                                <th className="p-4 font-medium">Amount</th>
                                <th className="p-4 font-medium text-right pr-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 pl-6 text-slate-400">{tx.date}</td>
                                    <td className="p-4 font-medium text-white">{tx.description}</td>
                                    <td className={`p-4 font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                                        {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs">
                                            {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
