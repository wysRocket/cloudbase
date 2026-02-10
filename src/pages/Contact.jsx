import { motion } from 'framer-motion'
import { useState } from 'react'

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: false, amount: 0.2 },
    transition: { duration: 0.8, ease: "easeOut" }
}

const valueProps = [
    {
        icon: '🚀',
        title: 'Migration Assistance',
        desc: 'Immediate, on-demand support for your migration. Our team ensures a smooth transition with zero downtime.'
    },
    {
        icon: '🛡️',
        title: 'Dedicated Support',
        desc: 'Technical experts and dedicated account managers provide ongoing guidance and 24/7 support.'
    },
    {
        icon: '💰',
        title: 'Transparent Pricing',
        desc: 'No hidden fees, no surprises. Our predictable pricing ensures you always know what you\'re paying.'
    }
]

const stats = [
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '50k+', label: 'Active Developers' },
    { value: '< 30s', label: 'Deployment Time' },
    { value: '24/7', label: 'Expert Support' }
]

export default function Contact() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        cloudSpend: '',
        message: ''
    })
    const [submitted, setSubmitted] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const cloudSpendOptions = [
        { value: '', label: 'Select an option' },
        { value: '0-500', label: '$0 - $500' },
        { value: '500-2000', label: '$500 - $2,000' },
        { value: '2000-10000', label: '$2,000 - $10,000' },
        { value: '10000+', label: '$10,000+' }
    ]

    const handleSubmit = (e) => {
        e.preventDefault()
        setSubmitted(true)
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleDropdownSelect = (value) => {
        setFormData({ ...formData, cloudSpend: value })
        setDropdownOpen(false)
    }

    return (
        <>
            {/* Hero Section with Two Columns */}
            <section className="relative pt-32 pb-20 px-6">
                <div className="aurora-blob w-[800px] h-[800px] bg-cyan-500/15 top-0 left-0 animate-aurora"></div>
                <div className="aurora-blob w-[600px] h-[600px] bg-blue-500/10 bottom-0 right-0 animate-aurora" style={{ animationDelay: '-5s' }}></div>

                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-start">
                        {/* Left Column - Value Props */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
                                <div className="overflow-hidden">
                                    <motion.span
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}
                                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                        className="block"
                                    >
                                        Contact
                                    </motion.span>
                                </div>
                                <div className="overflow-hidden text-cyan-400">
                                    <motion.span
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}
                                        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                        className="block"
                                    >
                                        Our Sales Team
                                    </motion.span>
                                </div>
                            </h1>
                            <p className="text-xl text-slate-400 mb-12 max-w-lg">
                                Ready to scale your infrastructure? Our team will help you find the perfect solution for your needs.
                            </p>

                            {/* Value Propositions */}
                            <div className="space-y-6">
                                {valueProps.map((prop, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + i * 0.1 }}
                                        className="flex gap-4"
                                    >
                                        <span className="text-3xl">{prop.icon}</span>
                                        <div>
                                            <h3 className="font-bold text-lg mb-1">{prop.title}</h3>
                                            <p className="text-slate-400 text-sm">{prop.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Right Column - Form */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            style={{ isolation: 'isolate', willChange: 'auto' }}
                        >
                            {submitted ? (
                                <div className="glass p-12 rounded-[2rem] text-center">
                                    <span className="text-6xl mb-6 block">✅</span>
                                    <h2 className="text-3xl font-bold mb-4">Thanks for reaching out!</h2>
                                    <p className="text-slate-400 mb-8">
                                        Our sales team will contact you within 24 hours.
                                    </p>
                                    <button
                                        onClick={() => setSubmitted(false)}
                                        className="px-6 py-3 glass rounded-full font-bold hover:bg-white/10 transition-all"
                                    >
                                        Send Another Message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="glass p-8 rounded-[2rem] space-y-5">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-2">Talk to Sales</h2>
                                        <p className="text-slate-400 text-sm">Fill out the form and we&apos;ll be in touch soon.</p>
                                    </div>

                                    {/* Name Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-slate-300">First Name *</label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                required
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all"
                                                placeholder="John"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-slate-300">Last Name *</label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                required
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all"
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>

                                    {/* Email & Phone Row */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-slate-300">Work Email *</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all"
                                                placeholder="john@company.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2 text-slate-300">Phone</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>

                                    {/* Company */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-300">Company Name *</label>
                                        <input
                                            type="text"
                                            name="company"
                                            required
                                            value={formData.company}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all"
                                            placeholder="Acme Inc."
                                        />
                                    </div>

                                    {/* Cloud Spend */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-300">Estimated Monthly Cloud Spend</label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all text-left flex justify-between items-center"
                                            >
                                                <span className={formData.cloudSpend ? 'text-white' : 'text-slate-500'}>
                                                    {cloudSpendOptions.find(opt => opt.value === formData.cloudSpend)?.label || 'Select an option'}
                                                </span>
                                                <svg
                                                    className={`w-5 h-5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {dropdownOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setDropdownOpen(false)}
                                                    />
                                                    <div className="absolute z-20 w-full mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                                        {cloudSpendOptions.map((option) => (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => handleDropdownSelect(option.value)}
                                                                className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                                                                    formData.cloudSpend === option.value ? 'bg-cyan-600/20 text-cyan-400' : 'text-white'
                                                                }`}
                                                            >
                                                                {option.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label className="block text-sm font-medium mb-2 text-slate-300">How can we help? *</label>
                                        <textarea
                                            name="message"
                                            required
                                            rows={4}
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all resize-none"
                                            placeholder="Tell us about your project, current infrastructure, or any specific requirements..."
                                        />
                                    </div>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Talk to an Expert
                                    </button>

                                    <p className="text-xs text-slate-500 text-center">
                                        By submitting, you agree to our <a href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</a>.
                                    </p>
                                </form>
                            )}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Trust Indicators / Stats */}
            <motion.section
                {...fadeInUp}
                className="py-20 px-6 bg-gradient-to-b from-transparent to-cyan-900/10"
            >
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-12 text-slate-300">
                        Trusted by 50,000+ developers worldwide
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="text-center"
                            >
                                <div className="text-4xl md:text-5xl font-black text-cyan-400 mb-2">{stat.value}</div>
                                <p className="text-slate-400">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Alternative Contact Options */}
            <motion.section
                {...fadeInUp}
                className="py-20 px-6"
            >
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Other Ways to Reach Us</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: '📧', title: 'General Inquiries', value: 'hello@wyscloudbase.com', href: 'mailto:hello@wyscloudbase.com' },
                            { icon: '🛟', title: 'Technical Support', value: 'support@wyscloudbase.com', href: 'mailto:support@wyscloudbase.com' },
                            { icon: '🏢', title: 'Enterprise', value: 'enterprise@wyscloudbase.com', href: 'mailto:enterprise@wyscloudbase.com' }
                        ].map((item, i) => (
                            <a
                                key={i}
                                href={item.href}
                                className="glass p-6 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-all group"
                            >
                                <span className="text-3xl">{item.icon}</span>
                                <div>
                                    <p className="text-sm text-slate-400">{item.title}</p>
                                    <p className="font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">{item.value}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </motion.section>
        </>
    )
}
