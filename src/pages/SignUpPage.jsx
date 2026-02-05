import { SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

export default function SignUpPage() {
    return (
        <section className="min-h-screen flex">
            {/* Left Column - Form */}
            <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-slate-100 relative">


                {/* Clerk Sign Up */}
                <div className="w-full max-w-md">
                    <SignUp
                        routing="virtual"
                        signInUrl="/sign-in"
                        fallbackRedirectUrl="/dashboard"
                        forceRedirectUrl="/dashboard"
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "!bg-slate-100 !shadow-none border-0 rounded-2xl",
                                headerTitle: "text-slate-900",
                                headerSubtitle: "text-slate-600",
                                socialButtonsBlockButton: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
                                socialButtonsBlockButtonText: "text-slate-700 font-medium",
                                dividerLine: "bg-slate-200",
                                dividerText: "text-slate-500",
                                formFieldLabel: "text-slate-700",
                                formFieldInput: "bg-white border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500",
                                formButtonPrimary: "bg-cyan-600 hover:bg-cyan-700 text-white",
                                footerActionLink: "text-cyan-600 hover:text-cyan-700",
                                identityPreviewText: "text-slate-900",
                                identityPreviewEditButton: "text-cyan-600",
                                formFieldInputShowPasswordButton: "text-slate-500",
                                alert: "bg-red-50 border-red-200 text-red-800",
                            }
                        }}
                    />
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 left-6 right-6 text-center text-xs text-slate-500">
                    By continuing, you agree to the WysCloudBase{' '}
                    <Link to="/terms" className="text-cyan-600 hover:underline">Terms of Service</Link> and{' '}
                    <Link to="/privacy" className="text-cyan-600 hover:underline">Privacy Policy</Link>.
                </div>
            </div>

            {/* Right Column - Hero Background */}
            <div className="hidden lg:flex flex-1 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
                {/* Hero Background Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/images/premium_hero_bg.png"
                        className="w-full h-full object-cover"
                        alt="Background"
                    />
                    {/* Atmospheric Overlays */}
                    <div className="absolute inset-0 bg-[#020617]/40 z-[1]"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/20 to-[#020617] z-[2]"></div>
                </div>

                {/* Subgrid Mesh for Technical Feel */}
                <div className="absolute inset-0 opacity-[0.15] z-[3] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '48px 48px' }}>
                </div>

                <div className="relative z-10 max-w-lg text-center">
                    <div className="text-6xl mb-6">✨</div>
                    <h2 className="text-3xl font-bold mb-4">
                        Start Your Cloud Journey
                    </h2>
                    <p className="text-lg text-white/80 mb-8">
                        Create your free account and get $100 in credits. Deploy VPS, Kubernetes clusters,
                        and GPU servers in minutes with our intuitive platform.
                    </p>
                    <div className="flex justify-center gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold">$100</div>
                            <div className="text-sm text-white/70">Free Credits</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold">15</div>
                            <div className="text-sm text-white/70">Global Regions</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold">50k+</div>
                            <div className="text-sm text-white/70">Developers</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
