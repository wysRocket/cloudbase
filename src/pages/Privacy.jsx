import { motion } from "framer-motion";

export default function Privacy() {
	return (
		<>
			<section className="pt-32 pb-20 px-6">
				<div className="max-w-4xl mx-auto">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
					>
						<h1 className="text-5xl font-black tracking-tighter mb-6">
							Privacy Policy
						</h1>
						<p className="text-slate-400 mb-12">Last updated: January 2024</p>
					</motion.div>

					<div className="prose prose-invert prose-lg max-w-none space-y-8">
						<section>
							{" "}
							<h2 className="text-2xl font-bold mb-4">Data Controller</h2>
							<div className="bg-white/5 border border-white/10 rounded-lg p-6 text-slate-300 space-y-1">
								<p>
									<span className="text-white font-semibold">
										Company Name:
									</span>{" "}
									SAMENTHWELL LTD
								</p>
								<p>
									<span className="text-white font-semibold">
										Registration Number:
									</span>{" "}
									HE487844
								</p>
								<p>
									<span className="text-white font-semibold">
										Registered Address:
									</span>{" "}
									Boumpoulinas, 23 Flat/Office 6, 2019, Nicosia, Cyprus
								</p>
								<p>
									<span className="text-white font-semibold">Phone:</span>{" "}
									<a
										href="tel:+441174101523"
										className="text-cyan-400 hover:text-cyan-300 transition-colors"
									>
										+44 117 410 1523
									</a>
								</p>
							</div>
						</section>

						<section>
							{" "}
							<h2 className="text-2xl font-bold mb-4">
								1. Information We Collect
							</h2>
							<p className="text-slate-300 leading-relaxed">
								We collect information you provide directly to us, including
								name, email address, billing information, and any other
								information you choose to provide. We also automatically collect
								certain information when you use our services, such as IP
								address, browser type, and usage data.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">
								2. How We Use Your Information
							</h2>
							<p className="text-slate-300 leading-relaxed mb-4">
								We use the information we collect to:
							</p>
							<ul className="list-disc list-inside text-slate-300 space-y-2">
								<li>Provide, maintain, and improve our services</li>
								<li>Process transactions and send related information</li>
								<li>Send technical notices and support messages</li>
								<li>Respond to your comments and questions</li>
								<li>Detect and prevent fraudulent transactions</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">
								3. Information Sharing
							</h2>
							<p className="text-slate-300 leading-relaxed">
								We do not sell, trade, or rent your personal information to
								third parties. We may share your information with service
								providers who assist us in operating our platform, conducting
								our business, or serving our users.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
							<p className="text-slate-300 leading-relaxed">
								We implement appropriate security measures to protect your
								personal information. All data is encrypted in transit and at
								rest. We regularly review and update our security practices.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
							<p className="text-slate-300 leading-relaxed">
								You have the right to access, correct, or delete your personal
								information. You may also opt out of marketing communications at
								any time. Contact us at privacy@cloudbase.com for any requests.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
							<p className="text-slate-300 leading-relaxed">
								If you have any questions about this Privacy Policy, please
								contact us at privacy@cloudbase.com.
							</p>
						</section>
					</div>
				</div>
			</section>
		</>
	);
}
