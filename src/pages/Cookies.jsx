import { motion } from 'framer-motion'

export default function Cookies() {
    return (
        <>
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl font-black tracking-tighter mb-6">Cookie Policy</h1>
                        <p className="text-slate-400 mb-12">Last updated: January 2025</p>
                    </motion.div>

                    <div className="prose prose-invert prose-lg max-w-none space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold mb-4">What Are Cookies</h2>
                            <p className="text-slate-300 leading-relaxed">
                                Cookies are small text files stored on your device when you visit our website. They help us
                                provide you with a better experience and allow certain features to work properly.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">How We Use Cookies</h2>
                            <p className="text-slate-300 leading-relaxed mb-4">We use cookies to:</p>
                            <ul className="list-disc list-inside text-slate-300 space-y-2">
                                <li>Keep you signed in to your account</li>
                                <li>Remember your preferences and settings</li>
                                <li>Understand how you use our services</li>
                                <li>Improve our website and services</li>
                                <li>Provide personalized content</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">Types of Cookies</h2>
                            <div className="space-y-4">
                                <div className="glass p-4 rounded-xl">
                                    <h3 className="font-bold text-cyan-400 mb-2">Essential Cookies</h3>
                                    <p className="text-slate-300">Required for basic site functionality. Cannot be disabled.</p>
                                </div>
                                <div className="glass p-4 rounded-xl">
                                    <h3 className="font-bold text-cyan-400 mb-2">Analytics Cookies</h3>
                                    <p className="text-slate-300">Help us understand how visitors interact with our site.</p>
                                </div>
                                <div className="glass p-4 rounded-xl">
                                    <h3 className="font-bold text-cyan-400 mb-2">Functional Cookies</h3>
                                    <p className="text-slate-300">Remember your preferences and settings.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">Managing Cookies</h2>
                            <p className="text-slate-300 leading-relaxed">
                                You can control cookies through your browser settings. However, disabling certain cookies may
                                affect the functionality of our website. Most browsers allow you to refuse or delete cookies.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
                            <p className="text-slate-300 leading-relaxed">
                                If you have questions about our cookie policy, contact us at privacy@wyscloudbase.com.
                            </p>
                        </section>
                    </div>
                </div>
            </section>
        </>
    )
}
