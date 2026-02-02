import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion'

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: false, amount: 0.2 },
    transition: { duration: 0.8, ease: "easeOut" }
}

const staggerContainer = {
    initial: {},
    whileInView: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

const slideInLeft = {
    initial: { opacity: 0, x: -100 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: false, amount: 0.2 },
    transition: { duration: 0.8, ease: "easeOut" }
}

const slideInRight = {
    initial: { opacity: 0, x: 100 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: false, amount: 0.2 },
    transition: { duration: 0.8, ease: "easeOut" }
}

const ShimmerGlare = () => (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="shimmer-glare absolute inset-0 w-[50%] h-[200%] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer"></div>
    </div>
)

export default function Home() {
    const location = useLocation()

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '')
            const element = document.getElementById(id)
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' })
                }, 100)
            }
        }
    }, [location])

    return (
        <>
            {/* HERO */}
            <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden px-6">
                <img src="/images/image-2.png" className="absolute inset-0 w-full h-full object-cover z-0 animate-subtle-zoom" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1d]/80 via-[#0a0f1d]/40 to-[#0a0f1d] z-[1]"></div>

                <div className="aurora-blob w-[500px] h-[500px] bg-cyan-500/20 top-[-10%] left-[-10%] animate-aurora"></div>
                <div className="aurora-blob w-[600px] h-[600px] bg-blue-600/20 bottom-[-20%] right-[-10%] animate-aurora" style={{ animationDelay: '-5s' }}></div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 max-w-4xl text-center"
                >
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[0.9]">
                        <div className="overflow-hidden">
                            <motion.span
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="block"
                            >
                                Cloud Power
                            </motion.span>
                        </div>
                        <div className="overflow-hidden text-cyan-400">
                            <motion.span
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                className="block"
                            >
                                Simplified.
                            </motion.span>
                        </div>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                        WysCloudBase gives you the raw muscle of DigitalOcean infrastructure without the headache of complex configurations. Build, scale, and innovate in minutes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/contact" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:text-white transition-all transform hover:scale-105">
                            Deploy Your First Server
                        </Link>
                        <a href="#features" className="px-8 py-4 glass text-white font-bold rounded-full hover:bg-white/10 transition-all">
                            Explore Services
                        </a>
                    </div>
                </motion.div>
            </section>

            {/* LOGO MARQUEE */}
            <section className="py-12 bg-white/5 border-y border-white/5 overflow-hidden">
                <div className="flex gap-12 animate-marquee whitespace-nowrap items-center opacity-50 hover:opacity-100 transition-opacity">
                    <div className="flex gap-24 shrink-0 px-12">
                        <span className="text-2xl font-bold italic tracking-widest uppercase">DigitalOcean</span>
                        <span className="text-2xl font-bold italic tracking-widest uppercase">NVIDIA GPU</span>
                        <span className="text-2xl font-bold italic tracking-widest uppercase">Kubernetes</span>
                        <span className="text-2xl font-bold italic tracking-widest uppercase">Redis</span>
                        <span className="text-2xl font-bold italic tracking-widest uppercase">PostgreSQL</span>
                    </div>
                    <div className="flex gap-24 shrink-0 px-12">
                        <span className="text-2xl font-bold italic tracking-widest uppercase">DigitalOcean</span>
                        <span className="text-2xl font-bold italic tracking-widest uppercase">NVIDIA GPU</span>
                        <span className="text-2xl font-bold italic tracking-widest uppercase">Kubernetes</span>
                        <span className="text-2xl font-bold italic tracking-widest uppercase">Redis</span>
                        <span className="text-2xl font-bold italic tracking-widest uppercase">PostgreSQL</span>
                    </div>
                </div>
            </section>

            {/* BRUTALIST HOOK */}
            <motion.section
                {...fadeInUp}
                className="py-32 px-6 max-w-7xl mx-auto text-center"
            >
                <h2 className="text-4xl md:text-7xl font-bold tracking-tight leading-tight">
                    &quot;We built <span className="text-cyan-500">WysCloudBase</span> because high-performance cloud shouldn&apos;t require a PhD in systems engineering.&quot;
                </h2>
            </motion.section>

            {/* BENTO FEATURES */}
            <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
                <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    whileInView="whileInView"
                    viewport={{ once: false, amount: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-6"
                >
                    {/* VPS Card */}
                    <motion.div {...slideInLeft} className="md:col-span-8">
                        <Link to="/services/vps" className="glass p-10 rounded-[3rem] group hover:bg-white/10 transition-all overflow-hidden relative block h-full">
                            <ShimmerGlare />
                            <div className="relative z-10">
                                <span className="text-cyan-400 font-mono mb-4 block">01 / STABILITY</span>
                                <h3 className="text-4xl font-bold mb-4">Lightning VPS Hosting</h3>
                                <p className="text-slate-400 max-w-md">Blazing fast virtual private servers with NVMe storage. Spin up instances in 55 seconds flat.</p>
                                <span className="mt-8 px-6 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition-colors inline-block">View Plans</span>
                            </div>
                            <img src="/images/image-3.png" className="absolute -right-20 -bottom-20 w-80 h-auto opacity-30 group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                        </Link>
                    </motion.div>

                    {/* GPU Card */}
                    <motion.div {...slideInRight} className="md:col-span-4">
                        <Link to="/services/gpu" className="glass p-10 rounded-[3rem] bg-gradient-to-br from-cyan-600/20 to-blue-900/40 border-cyan-500/30 block h-full relative overflow-hidden">
                            <ShimmerGlare />
                            <span className="text-cyan-300 font-mono mb-4 block">02 / AI READY</span>
                            <h3 className="text-3xl font-bold mb-4">GPU Clusters</h3>
                            <p className="text-slate-300">NVIDIA-powered computing for deep learning and AI training. Rent power, not just hardware.</p>
                        </Link>
                    </motion.div>

                    {/* Kubernetes Card */}
                    <motion.div {...slideInLeft} className="md:col-span-4">
                        <Link to="/services/kubernetes" className="glass p-10 rounded-[3rem] flex flex-col justify-between block h-full relative overflow-hidden">
                            <ShimmerGlare />
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Kubernetes</h3>
                                <p className="text-slate-400 text-sm">Intelligent orchestration made simple.</p>
                            </div>
                            <div className="mt-12 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 w-3/4 animate-pulse"></div>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Game Servers */}
                    <motion.div {...slideInRight} className="md:col-span-8">
                        <Link to="/services/game-servers" className="glass p-10 rounded-[3rem] flex items-center gap-8 group block h-full relative overflow-hidden">
                            <ShimmerGlare />
                            <div className="flex-1 relative z-10">
                                <h3 className="text-3xl font-bold mb-2">Game Server Hosting</h3>
                                <p className="text-slate-400">Low-latency environments for Rust, Minecraft, and CS2. Instant deployment for your community.</p>
                            </div>
                            <div className="w-32 h-32 glass rounded-2xl flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform relative z-10">
                                <svg className="w-16 h-16 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2m4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5m3-3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5Z" />
                                </svg>
                            </div>
                        </Link>
                    </motion.div>
                </motion.div>
            </section>

            {/* LIQUID GLASS MANIFESTO */}
            <motion.section
                {...fadeInUp}
                className="py-32 bg-[#0d1425]"
            >
                <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
                    <div className="relative">
                        <div className="w-full aspect-square glass rounded-[4rem] animate-slow-spin flex items-center justify-center border-white/5 opacity-40"></div>
                        <img src="/images/image-4.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-auto drop-shadow-[0_0_50px_rgba(34,211,238,0.3)]" loading="lazy" />
                    </div>
                    <div>
                        <h2 className="text-5xl font-bold mb-8 tracking-tight">Enterprise muscle without the mess.</h2>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                </div>
                                <p className="text-lg"><strong>One-Click Magic.</strong> Don&apos;t waste time on SSH configs. Deploy with a single click and get your passwords instantly.</p>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                </div>
                                <p className="text-lg"><strong>Transparent Pricing.</strong> We hate hidden fees too. You only pay for what you use, down to the cent.</p>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                                </div>
                                <p className="text-lg"><strong>Smart Scaling.</strong> Your traffic spiked? Our system recommends the perfect server size to keep you running fast.</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </motion.section>

            {/* HOW IT WORKS */}
            <section
                id="overview"
                className="py-24 px-6 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 overflow-hidden"
            >
                <motion.div {...slideInLeft} className="sticky top-32 h-fit">
                    <h2 className="text-5xl font-bold mb-6">How It Works</h2>
                    <p className="text-xl text-slate-400 mb-8">We&apos;ve stripped away the fluff so you can focus on building. It&apos;s a simple three-step dance to global scale.</p>
                    <div className="space-y-4">
                        <div className="p-6 glass rounded-2xl border-l-4 border-cyan-500 relative overflow-hidden">
                            <ShimmerGlare />
                            <div className="relative z-10">
                                <span className="text-sm font-bold text-cyan-400 block mb-1">STEP 01</span>
                                <h4 className="text-xl font-bold">Pick Your Base</h4>
                            </div>
                        </div>
                        <div className="p-6 glass rounded-2xl border-l-4 border-white/5 opacity-40 hover:opacity-100 transition-opacity relative overflow-hidden">
                            <ShimmerGlare />
                            <div className="relative z-10">
                                <span className="text-sm font-bold text-slate-500 block mb-1">STEP 02</span>
                                <h4 className="text-xl font-bold">Configure Your Specs</h4>
                            </div>
                        </div>
                        <div className="p-6 glass rounded-2xl border-l-4 border-white/5 opacity-40 hover:opacity-100 transition-opacity relative overflow-hidden">
                            <ShimmerGlare />
                            <div className="relative z-10">
                                <span className="text-sm font-bold text-slate-500 block mb-1">STEP 03</span>
                                <h4 className="text-xl font-bold">Blast Off</h4>
                            </div>
                        </div>
                    </div>
                </motion.div>
                <motion.div {...slideInRight} className="space-y-12">
                    <div className="aspect-video glass rounded-[2rem] overflow-hidden group">
                        <img src="/images/image-5.png" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                    </div>
                    <div className="p-12 glass rounded-[3rem] bg-black relative overflow-hidden">
                        <ShimmerGlare />
                        <div className="relative z-10">
                            <h3 className="text-3xl font-bold mb-4">Under the Hood</h3>
                            <p className="text-slate-400 leading-relaxed mb-6">WysCloudBase is built directly on top of DigitalOcean&apos;s enterprise network. You get the stability of a billion-dollar infrastructure with a UI that doesn&apos;t make your brain hurt.</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <span className="text-2xl font-bold">99.9%</span>
                                    <p className="text-xs text-slate-500 uppercase">Uptime SLA</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <span className="text-2xl font-bold">55s</span>
                                    <p className="text-xs text-slate-500 uppercase">Avg Deploy</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* STATISTICS */}
            <motion.section
                {...fadeInUp}
                className="py-24 bg-gradient-to-b from-transparent to-cyan-900/10"
            >
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <StatItem value={12} suffix="M+" label="Servers Deployed" />
                    <StatItem value={50} suffix="k" label="Active Developers" />
                    <StatItem value={15} label="Global Regions" />
                    <StatItem value={0} label="Hidden Fees" />
                </div>
            </motion.section>

            {/* THE VOID */}
            <motion.section
                {...fadeInUp}
                className="py-32 bg-black text-white relative overflow-hidden"
            >
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold mb-8">Stop fighting your infrastructure.</h2>
                    <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12">Every minute you spend configuring YAML files is a minute you aren&apos;t building your product. Scale shouldn&apos;t be scary.</p>
                    <div className="w-px h-24 bg-gradient-to-b from-cyan-500 to-transparent mx-auto"></div>
                </div>
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="aurora-blob w-[800px] h-[800px] bg-red-500/20 -top-1/2 -left-1/4"></div>
                </div>
            </motion.section>

            {/* PRICING PREVIEW */}
            <motion.section
                {...fadeInUp}
                id="pricing"
                className="py-32 px-6"
            >
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-5xl font-bold mb-4">Pick Your Power.</h2>
                        <p className="text-slate-400">Scalable plans for every project size.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Basic */}
                        <div className="glass p-12 rounded-[3rem] border-white/5 flex flex-col hover:scale-105 transition-transform duration-500 relative overflow-hidden">
                            <ShimmerGlare />
                            <div className="relative z-10 flex flex-col h-full">
                                <h4 className="text-2xl font-bold mb-2">Hobbyist</h4>
                                <p className="text-slate-400 mb-8 text-sm">Perfect for side projects & blogs.</p>
                                <div className="text-5xl font-black mb-8">$5<span className="text-lg font-normal text-slate-500">/mo</span></div>
                                <ul className="space-y-4 mb-12 flex-1">
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        1GB RAM / 25GB NVMe
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        1 vCPU
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Global CDN Access
                                    </li>
                                </ul>
                                <Link to="/pricing" className="w-full py-4 glass rounded-2xl hover:bg-white/10 font-bold text-center block">Start Free Trial</Link>
                            </div>
                        </div>

                        {/* Pro */}
                        <div className="glass p-12 rounded-[3rem] border-cyan-500/50 bg-cyan-950/20 relative overflow-hidden transform scale-110 z-10">
                            <ShimmerGlare />
                            <div className="relative z-10 flex flex-col h-full">
                                <div className="absolute top-6 right-6 bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">Popular</div>
                                <h4 className="text-2xl font-bold mb-2">Startup</h4>
                                <p className="text-slate-400 mb-8 text-sm">Scaling apps & growing traffic.</p>
                                <div className="text-5xl font-black mb-8">$20<span className="text-lg font-normal text-slate-500">/mo</span></div>
                                <ul className="space-y-4 mb-12 flex-1">
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        4GB RAM / 80GB NVMe
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        2 vCPUs
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Daily Backups Included
                                    </li>
                                </ul>
                                <Link to="/contact" className="w-full py-4 bg-cyan-600 rounded-2xl hover:bg-cyan-500 font-bold shadow-[0_0_20px_rgba(8,145,178,0.4)] text-center block">Choose Startup</Link>
                            </div>
                        </div>

                        {/* Enterprise */}
                        <div className="glass p-12 rounded-[3rem] border-white/5 flex flex-col hover:scale-105 transition-transform duration-500 relative overflow-hidden">
                            <ShimmerGlare />
                            <div className="relative z-10 flex flex-col h-full">
                                <h4 className="text-2xl font-bold mb-2">Enterprise</h4>
                                <p className="text-slate-400 mb-8 text-sm">Custom needs, global power.</p>
                                <div className="text-5xl font-black mb-8">Custom</div>
                                <ul className="space-y-4 mb-12 flex-1">
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Dedicated GPUs
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        24/7 Phone Support
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Isolated Private Network
                                    </li>
                                </ul>
                                <Link to="/contact" className="w-full py-4 glass rounded-2xl hover:bg-white/10 font-bold text-center block">Contact Sales</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* SOCIAL PULSE */}
            <motion.section
                {...fadeInUp}
                className="py-24 bg-white/5"
            >
                <div className="max-w-7xl mx-auto px-6 overflow-hidden">
                    <div className="grid md:grid-cols-2 gap-24 items-center">
                        <div>
                            <h2 className="text-5xl font-bold mb-6">Built for everyone.</h2>
                            <div className="space-y-4">
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="glass p-6 rounded-2xl flex items-center gap-4"
                                >
                                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold">Deployment Successful</p>
                                        <p className="text-xs text-slate-500">VPS-Tokyo-01 is now live.</p>
                                    </div>
                                </motion.div>
                                <div className="glass p-6 rounded-2xl flex items-center gap-4 translate-x-12">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold">Auto-scaling recommendation</p>
                                        <p className="text-xs text-slate-500">Traffic up 40%. Ready to upgrade?</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="columns-2 gap-6 space-y-6">
                            <motion.div {...slideInRight}>
                                <Link to="/about" className="glass rounded-3xl p-6 aspect-square flex items-end block relative overflow-hidden group">
                                    <ShimmerGlare />
                                    <img src="/images/Freelancers.jpg" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" alt="Freelancers" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] to-transparent opacity-60"></div>
                                    <h5 className="text-xl font-bold relative z-10">Freelancers</h5>
                                </Link>
                            </motion.div>
                            <motion.div {...slideInRight} transition={{ ...slideInRight.transition, delay: 0.2 }}>
                                <Link to="/about" className="glass rounded-3xl p-6 h-80 flex items-end block relative overflow-hidden group">
                                    <ShimmerGlare />
                                    <img src="/images/Students.jpg" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" alt="Students" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] to-transparent opacity-60"></div>
                                    <h5 className="text-xl font-bold relative z-10">Students</h5>
                                </Link>
                            </motion.div>
                            <motion.div {...slideInRight} transition={{ ...slideInRight.transition, delay: 0.1 }}>
                                <Link to="/about" className="glass rounded-3xl p-6 h-64 flex items-end block relative overflow-hidden group">
                                    <ShimmerGlare />
                                    <img src="/images/Startups.jpg" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" alt="Startups" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] to-transparent opacity-60"></div>
                                    <h5 className="text-xl font-bold relative z-10">Startups</h5>
                                </Link>
                            </motion.div>
                            <motion.div {...slideInRight} transition={{ ...slideInRight.transition, delay: 0.3 }}>
                                <Link to="/services/gpu" className="glass rounded-3xl p-6 aspect-video flex items-end block relative overflow-hidden group">
                                    <ShimmerGlare />
                                    <img src="/images/AILabs.jpg" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" alt="AI Labs" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] to-transparent opacity-60"></div>
                                    <h5 className="text-xl font-bold relative z-10">AI Labs</h5>
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* STICKY CARDS */}
            <motion.section
                {...fadeInUp}
                className="py-32 max-w-5xl mx-auto px-6"
            >
                <div className="space-y-24">
                    <div className="sticky top-24 glass p-12 rounded-[3rem] shadow-2xl bg-[#0d1425] border-cyan-500/20 h-[400px] flex flex-col justify-center overflow-hidden relative group">
                        <ShimmerGlare />
                        <div className="relative z-10">
                            <span className="text-cyan-400 font-mono mb-4 block">PHASE 01</span>
                            <h3 className="text-4xl font-bold mb-4">Instant Provisioning</h3>
                            <p className="text-lg text-slate-400">We don&apos;t make you wait. Our API talks to DigitalOcean instantly, handing you the keys to your new home in under a minute.</p>
                        </div>
                    </div>
                    <div className="sticky top-28 glass p-12 rounded-[3rem] shadow-2xl bg-[#111a31] border-cyan-500/20 h-[400px] flex flex-col justify-center translate-y-4 overflow-hidden relative group">
                        <ShimmerGlare />
                        <div className="relative z-10">
                            <span className="text-cyan-400 font-mono mb-4 block">PHASE 02</span>
                            <h3 className="text-4xl font-bold mb-4">Zero Configuration</h3>
                            <p className="text-lg text-slate-400">Passwords? Emailed. IP? Assigned. OS? Pre-installed. You just log in and start your project immediately.</p>
                        </div>
                    </div>
                    <div className="sticky top-32 glass p-12 rounded-[3rem] shadow-2xl bg-[#15203d] border-cyan-500/20 h-[400px] flex flex-col justify-center translate-y-8 overflow-hidden relative group">
                        <ShimmerGlare />
                        <div className="relative z-10">
                            <span className="text-cyan-400 font-mono mb-4 block">PHASE 03</span>
                            <h3 className="text-4xl font-bold mb-4">Unified Control</h3>
                            <p className="text-lg text-slate-400">Manage your entire empire from one dashboard. No command line required—unless you really want it.</p>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* FAQ */}
            <FAQSection />

            {/* CTA */}
            <section id="cta" className="py-48 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-cyan-600/20 z-0"></div>
                <img src="/images/image-6.png" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 z-0" loading="lazy" />
                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 uppercase leading-none italic">
                        Build. Scale.<br /><span className="text-cyan-400">Innovate.</span>
                    </h2>
                    <p className="text-2xl text-slate-200 mb-12 font-medium">Your cloud journey starts with a single click. No credit card required for the first 14 days.</p>
                    <Link to="/contact" className="px-12 py-6 bg-white text-black text-xl font-black rounded-full hover:bg-cyan-400 hover:text-white transition-all transform hover:scale-110 shadow-[0_0_50px_rgba(255,255,255,0.3)] inline-block">
                        Launch Your Dashboard
                    </Link>
                </div>
            </section>
        </>
    )
}

// Stat Item Component with Animated Counter
function StatItem({ value, suffix = '', label }) {
    const count = useMotionValue(0)
    const rounded = useTransform(count, (latest) => Math.round(latest))
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.5 })

    useEffect(() => {
        if (isInView) {
            animate(count, value, { duration: 2, ease: "easeOut" })
        }
    }, [isInView, count, value])

    return (
        <div ref={ref} className="text-center">
            <div className="text-5xl font-black mb-2">
                <motion.span>{rounded}</motion.span>{suffix}
            </div>
            <p className="text-cyan-400 font-mono text-sm uppercase">{label}</p>
        </div>
    )
}

// FAQ Component
function FAQSection() {
    const [active, setActive] = useState(0)

    const faqs = [
        {
            q: "Do I need to know Linux to use WysCloudBase?",
            a: "Not at all. We've simplified the core tasks (reboots, backups, scaling) into a visual dashboard. If you're a pro, you still get full SSH access."
        },
        {
            q: "Where are your servers located?",
            a: "We offer 15+ locations globally, including NYC, London, Frankfurt, Tokyo, and Singapore. Pick the one closest to your users for the best speed."
        },
        {
            q: "What's the catch with the pricing?",
            a: "No catch. We use DigitalOcean's infrastructure at scale and pass the simplicity to you. You pay for what you use, and we handle the technical debt."
        }
    ]

    return (
        <section id="faq" className="py-32 px-6 max-w-3xl mx-auto">
            <h2 className="text-5xl font-bold mb-16 text-center">Questions?</h2>
            <div className="space-y-4">
                {faqs.map((faq, i) => (
                    <div key={i} className="glass rounded-2xl overflow-hidden relative group">
                        <ShimmerGlare />
                        <div className="relative z-10">
                            <button
                                onClick={() => setActive(active === i + 1 ? 0 : i + 1)}
                                className="w-full p-6 flex justify-between items-center text-left hover:bg-white/5 transition-colors"
                            >
                                <span className="text-xl font-bold">{faq.q}</span>
                                <svg className={`w-6 h-6 transition-transform ${active === i + 1 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                                </svg>
                            </button>
                            {active === i + 1 && (
                                <div className="p-6 pt-0 text-slate-400 leading-relaxed">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
