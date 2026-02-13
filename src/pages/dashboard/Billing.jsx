import { motion } from 'framer-motion'
import { useDashboard } from '../../context/DashboardContext'
import { useState } from 'react'

export default function Billing() {
    const { balance, addFunds, transactions } = useDashboard()
    const [showTopUp, setShowTopUp] = useState(false)
    const [selectedCurrency, setSelectedCurrency] = useState('EUR')
    const [topUpAmount, setTopUpAmount] = useState(10)

    // Exchange rate: 1 GBP = 117 credits, 1 EUR = 100 credits
    const exchangeRate = selectedCurrency === 'GBP' ? 117 : 100
    const presetAmounts = [5, 10, 25, 50, 100]
    const currencySymbols = { EUR: '€', GBP: '£' }

    const handleTopUp = () => {
        const creditsToAdd = Math.floor(topUpAmount * exchangeRate)
        const currencySymbol = currencySymbols[selectedCurrency]
        const currencyPaid = `${currencySymbol}${topUpAmount}`
        addFunds(creditsToAdd, currencyPaid, selectedCurrency)
        setShowTopUp(false)
        setTopUpAmount(10)
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Billing & Payments</h1>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-8">
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Account Balance</h3>
                    <div className="text-4xl font-bold text-white mb-2">{Math.floor(balance)} <span className="text-2xl text-cyan-400">credits</span></div>
                    <p className="text-slate-500 text-xs mb-6">Purchase credits to spend on services</p>
                    <button
                        onClick={() => setShowTopUp(true)}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25"
                    >
                        Top Up Credits
                    </button>
                </div>

                <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-8">
                    <h3 className="text-slate-400 text-sm font-medium mb-2">Active Plan</h3>
                    <div className="text-2xl font-bold text-white mb-1">Pro Plan</div>
                    <p className="text-slate-400 text-sm mb-6">2900 credits / month</p>
                    <button
                        onClick={() => {
                            // TODO: Implement plan change functionality
                            console.log('Change plan clicked')
                        }}
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                    >
                        Change Plan &rarr;
                    </button>
                </div>
            </div>

            {/* Top-Up Modal */}
            {showTopUp && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#0f1629] border border-white/10 rounded-2xl p-8 max-w-md w-full"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Top Up Credits</h2>
                            <button
                                onClick={() => setShowTopUp(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Currency Selection */}
                        <div className="mb-6">
                            <label className="text-sm text-slate-400 mb-2 block">Select Currency</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['EUR', 'GBP'].map((currency) => (
                                    <button
                                        key={currency}
                                        onClick={() => setSelectedCurrency(currency)}
                                        className={`py-3 rounded-xl font-bold transition-all ${
                                            selectedCurrency === currency
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {currencySymbols[currency]} {currency}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preset Amounts */}
                        <div className="mb-6">
                            <label className="text-sm text-slate-400 mb-2 block">Quick Select</label>
                            <div className="grid grid-cols-5 gap-2">
                                {presetAmounts.map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setTopUpAmount(amount)}
                                        className={`py-2 rounded-lg text-sm font-bold transition-all ${
                                            topUpAmount === amount
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                        }`}
                                    >
                                        {amount}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Slider with Increment/Decrement Buttons */}
                        <div className="mb-6">
                            <label className="text-sm text-slate-400 mb-2 block">Custom Amount</label>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => setTopUpAmount(prev => Math.min(Math.max(prev + 1, 1), 200))}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold transition-all"
                                    >
                                        +1
                                    </button>
                                    <button
                                        onClick={() => setTopUpAmount(prev => Math.min(Math.max(prev - 1, 1), 200))}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold transition-all"
                                    >
                                        -1
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <button
                                        onClick={() => setTopUpAmount(prev => Math.min(Math.max(prev + 10, 1), 200))}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold transition-all"
                                    >
                                        +10
                                    </button>
                                    <button
                                        onClick={() => setTopUpAmount(prev => Math.min(Math.max(prev - 10, 1), 200))}
                                        className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-bold transition-all"
                                    >
                                        -10
                                    </button>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="200"
                                    step="1"
                                    value={topUpAmount}
                                    onChange={(e) => setTopUpAmount(parseInt(e.target.value))}
                                    className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>{currencySymbols[selectedCurrency]}1</span>
                                <span>{currencySymbols[selectedCurrency]}200</span>
                            </div>
                        </div>

                        {/* Manual Input */}
                        <div className="mb-6">
                            <label className="text-sm text-slate-400 mb-2 block">Or Enter Exact Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                                    {currencySymbols[selectedCurrency]}
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    step="1"
                                    value={topUpAmount}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setTopUpAmount(Math.min(Math.max(val, 1), 200));
                                    }}
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Amount Display */}
                        <div className="bg-white/5 rounded-xl p-6 mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-slate-400">Amount</span>
                                <span className="text-2xl font-bold">{currencySymbols[selectedCurrency]}{topUpAmount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Credits</span>
                                <span className="text-2xl font-bold text-cyan-400">{Math.floor(topUpAmount * exchangeRate)}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-3 text-center">
                                Exchange rate: 1 {selectedCurrency} = {exchangeRate} credits
                            </div>
                        </div>

                        {/* Checkout Button */}
                        <button
                            onClick={handleTopUp}
                            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-cyan-500/25"
                        >
                            Proceed to Checkout
                        </button>
                    </motion.div>
                </div>
            )}

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
                                <th className="p-4 font-medium">Currency Paid</th>
                                <th className="p-4 font-medium text-right pr-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 pl-6 text-slate-400">{tx.date}</td>
                                    <td className="p-4 font-medium text-white">{tx.description}</td>
                                    <td className={`p-4 font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-white'}`}>
                                        {tx.amount > 0 ? `+${Math.floor(tx.amount)}` : `${Math.floor(tx.amount)}`} credits
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {tx.currencyPaid || '-'}
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

            <style jsx>{`
                .slider-thumb::-webkit-slider-thumb {
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #06b6d4;
                    cursor: pointer;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
                }
                .slider-thumb::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    background: #06b6d4;
                    cursor: pointer;
                    border-radius: 50%;
                    border: none;
                    box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
                }
            `}</style>
        </div>
    )
}
