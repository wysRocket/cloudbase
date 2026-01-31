import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: 'general',
        message: ''
    })
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        // In production, this would send to an API
        setSubmitted(true)
    }

    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-16 px-6 overflow-hidden">
                <div className="aurora-blob w-[600px] h-[600px] bg-cyan-500/20 top-0 left-0 animate-aurora"></div>
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            Get in <span className="text-cyan-400">Touch</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl">
                            Have questions? Want to start your cloud journey? We&apos;re here to help.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Contact Form & Info */}
            <section className="py-16 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
                    {/* Form */}
                    <div>
                        {submitted ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass p-12 rounded-[2rem] text-center"
                            >
                                <span className="text-6xl mb-6 block">✅</span>
                                <h2 className="text-3xl font-bold mb-4">Message Sent!</h2>
                                <p className="text-slate-400 mb-8">We&apos;ll get back to you within 24 hours.</p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="px-6 py-3 glass rounded-full font-bold hover:bg-white/10 transition-all"
                                >
                                    Send Another Message
                                </button>
                            </motion.div>
                        ) : (
                            <form onSubmit={handleSubmit} className="glass p-8 rounded-[2rem] space-y-6">
                                <div>
                                    <label className="block text-sm font-bold mb-2">Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Subject</label>
                                    <select
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                                    >
                                        <option value="general">General Inquiry</option>
                                        <option value="sales">Sales</option>
                                        <option value="support">Technical Support</option>
                                        <option value="billing">Billing</option>
                                        <option value="partnership">Partnership</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Message</label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-500 resize-none"
                                        placeholder="How can we help you?"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold transition-all"
                                >
                                    Send Message
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
                            <p className="text-slate-400 leading-relaxed">
                                Our team is available Monday through Friday, 9am to 6pm EST.
                                We typically respond within 24 hours.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {[
                                { label: 'Email', value: 'hello@wyscloudbase.com', icon: '✉️' },
                                { label: 'Sales', value: 'sales@wyscloudbase.com', icon: '💼' },
                                { label: 'Support', value: 'support@wyscloudbase.com', icon: '🛟' },
                            ].map((item, i) => (
                                <div key={i} className="glass p-6 rounded-2xl flex items-center gap-4">
                                    <span className="text-3xl">{item.icon}</span>
                                    <div>
                                        <p className="text-sm text-slate-400">{item.label}</p>
                                        <p className="font-bold text-cyan-400">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="glass p-8 rounded-2xl">
                            <h3 className="text-xl font-bold mb-4">Enterprise Solutions</h3>
                            <p className="text-slate-400 mb-6">
                                Need custom infrastructure, dedicated support, or volume pricing?
                                Let&apos;s talk about your specific needs.
                            </p>
                            <a
                                href="mailto:enterprise@wyscloudbase.com"
                                className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:text-white transition-all inline-block"
                            >
                                Contact Enterprise Team
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
