import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useEffect, useState, useRef } from 'react'
import DashboardSidebar from '../components/dashboard/DashboardSidebar'
import { DashboardProvider } from '../context/DashboardContext'

const initialNotifications = [
    { id: 1, title: 'Welcome to WysCloudTop!', message: 'Your account is ready. Deploy your first service to get started.', time: '2 hours ago', read: false },
    { id: 2, title: 'System Maintenance Scheduled', message: 'Planned maintenance on Feb 20, 2026 at 03:00 UTC. Expect up to 15 minutes of downtime.', time: '1 day ago', read: false },
    { id: 3, title: 'Pro Plan Activated', message: 'Your Pro Plan subscription is now active. Enjoy 2900 credits/month.', time: '3 days ago', read: true },
]

export default function DashboardLayout({ children }) {
    const { isLoaded, isSignedIn } = useUser()
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [notifications, setNotifications] = useState(initialNotifications)
    const notifRef = useRef(null)

    const unreadCount = notifications.filter(n => !n.read).length

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            navigate('/sign-in', { replace: true })
        }
    }, [isLoaded, isSignedIn, navigate])

    // Close sidebar on route change (for mobile)
    useEffect(() => {
        setIsSidebarOpen(false)
    }, [window.location.pathname])

    // Click outside to close notifications
    useEffect(() => {
        function handleClickOutside(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false)
            }
        }
        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showNotifications])

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const markOneRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    if (!isLoaded || !isSignedIn) {
        return (
            <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <DashboardProvider>
            <div className="bg-[#0a0f1d] min-h-screen text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
                <div className="flex h-screen overflow-hidden">
                    <DashboardSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

                    {/* Main Content Area */}
                    <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-64'} ml-0 relative`}>
                        {/* Header/Top Bar */}
                        <header className="sticky top-0 z-10 bg-[#0a0f1d]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="md:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-lg"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>
                                <span className="hidden md:inline">Dashboard</span>
                                <span className="hidden md:inline">/</span>
                                <span className="text-white">Overview</span>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Notification Bell */}
                                <div className="relative" ref={notifRef}>
                                    <button
                                        onClick={() => setShowNotifications(!showNotifications)}
                                        className="p-2 text-slate-400 hover:text-white transition-colors relative"
                                        aria-label="Notifications"
                                    >
                                        {unreadCount > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-cyan-500 rounded-full ring-2 ring-[#0a0f1d] animate-pulse"></span>
                                        )}
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </button>

                                    {/* Notification Dropdown */}
                                    {showNotifications && (
                                        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#0f1629] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                                            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                                <h3 className="font-bold text-sm">Notifications</h3>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllRead}
                                                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                                    >
                                                        Mark all as read
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {notifications.map((notif) => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => markOneRead(notif.id)}
                                                        className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-cyan-500/5' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            {!notif.read && (
                                                                <span className="w-2 h-2 bg-cyan-500 rounded-full mt-1.5 shrink-0"></span>
                                                            )}
                                                            <div className={!notif.read ? '' : 'ml-5'}>
                                                                <p className={`text-sm font-medium ${!notif.read ? 'text-white' : 'text-slate-300'}`}>{notif.title}</p>
                                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                                                                <p className="text-xs text-slate-600 mt-1">{notif.time}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {notifications.length === 0 && (
                                                <div className="p-8 text-center text-slate-500 text-sm">
                                                    No notifications
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </header>

                        <div className="p-4 md:p-8 pb-20">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </DashboardProvider>
    )
}
