import { useUser } from '@clerk/clerk-react'
import { motion } from 'framer-motion'

export default function Settings() {
    const { user } = useUser()

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

            <div className="space-y-6">
                <div className="bg-[#0f1629] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-6">Profile Information</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <img src={user?.imageUrl} alt="Profile" className="w-16 h-16 rounded-full border-2 border-cyan-500/20" />
                            <div>
                                <h3 className="font-bold text-white">{user?.fullName}</h3>
                                <p className="text-slate-400 text-sm">{user?.primaryEmailAddress?.emailAddress}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Full Name</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={user?.fullName || ''}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-300 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Email</label>
                                <input
                                    type="text"
                                    readOnly
                                    value={user?.primaryEmailAddress?.emailAddress || ''}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-slate-300 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0f1629] border border-white/10 rounded-2xl p-6 border-red-500/20">
                    <h2 className="text-xl font-bold mb-2 text-red-400">Danger Zone</h2>
                    <p className="text-slate-400 text-sm mb-6">Once you delete your account, there is no going back. Please be certain.</p>
                    <button className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold border border-red-500/20 transition-all">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    )
}
