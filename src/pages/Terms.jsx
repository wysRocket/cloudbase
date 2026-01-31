import { motion } from 'framer-motion'

export default function Terms() {
    return (
        <>
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-5xl font-black tracking-tighter mb-6">Terms of Service</h1>
                        <p className="text-slate-400 mb-12">Last updated: January 2024</p>
                    </motion.div>

                    <div className="prose prose-invert prose-lg max-w-none space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
                            <p className="text-slate-300 leading-relaxed">
                                By accessing or using WysCloudBase services, you agree to be bound by these Terms of Service.
                                If you do not agree to these terms, please do not use our services.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
                            <p className="text-slate-300 leading-relaxed">
                                WysCloudBase provides cloud infrastructure services including VPS hosting, managed Kubernetes,
                                GPU servers, database hosting, and game server hosting built on DigitalOcean infrastructure.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">3. User Responsibilities</h2>
                            <p className="text-slate-300 leading-relaxed mb-4">You agree to:</p>
                            <ul className="list-disc list-inside text-slate-300 space-y-2">
                                <li>Provide accurate account information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Use services in compliance with all applicable laws</li>
                                <li>Not use services for illegal or harmful activities</li>
                                <li>Pay all fees according to the pricing terms</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">4. Service Level Agreement</h2>
                            <p className="text-slate-300 leading-relaxed">
                                We guarantee 99.9% uptime for all services. If we fail to meet this SLA, you may be eligible
                                for service credits as outlined in our SLA documentation.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">5. Payment Terms</h2>
                            <p className="text-slate-300 leading-relaxed">
                                Services are billed monthly in advance. You authorize us to charge your payment method on file.
                                All fees are non-refundable except as required by law or as specifically stated otherwise.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">6. Termination</h2>
                            <p className="text-slate-300 leading-relaxed">
                                Either party may terminate the agreement at any time. Upon termination, your access to services
                                will be suspended and data may be deleted after a 30-day grace period.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
                            <p className="text-slate-300 leading-relaxed">
                                WysCloudBase shall not be liable for any indirect, incidental, or consequential damages arising
                                from your use of our services. Our total liability shall not exceed the fees paid in the 12 months
                                preceding the claim.
                            </p>
                        </section>
                    </div>
                </div>
            </section>
        </>
    )
}
