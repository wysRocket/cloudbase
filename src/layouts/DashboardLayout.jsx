import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import SmoothScroll from '../components/SmoothScroll'
import CustomCursor from '../components/CustomCursor'

export default function DashboardLayout({ children }) {
    const { isLoaded, isSignedIn } = useUser()
    const navigate = useNavigate()

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/sign-in')
        }
    }, [isLoaded, isSignedIn, navigate])

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="bg-[#0a0f1d] min-h-screen text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
            <SmoothScroll />
            <CustomCursor />

            <div className="flex h-screen overflow-hidden">
                <DashboardSidebar />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto ml-64 relative">
                    {/* Header/Top Bar */}
                    <header className="sticky top-0 z-10 bg-[#0a0f1d]/80 backdrop-blur-xl border-b border-white/5 px-8 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>Dashboard</span>
                            <span>/</span>
                            <span className="text-white">Overview</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
                                <span className="absolute top-2 right-2 w-2 h-2 bg-cyan-500 rounded-full"></span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </button>
                        </div>
                    </header>

                    <div className="p-8 pb-20">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
