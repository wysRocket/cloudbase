import { motion } from "framer-motion";

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
						<h1 className="text-5xl font-black tracking-tighter mb-6">
							Terms of Service
						</h1>
						<p className="text-slate-400 mb-12">Last updated: January 2024</p>
					</motion.div>

					<div className="prose prose-invert prose-lg max-w-none space-y-8">
						<section>
							<h2 className="text-2xl font-bold mb-4">Company Information</h2>
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
										href="tel:+447457426572"
										className="text-cyan-400 hover:text-cyan-300 transition-colors"
									>
										+44 7457 426572
									</a>
								</p>
							</div>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">
								1. Acceptance of Terms
							</h2>
							<p className="text-slate-300 leading-relaxed">
								By accessing, registering for, or using Cloudbase services, you acknowledge that you have read, understood, and agree to be bound unconditionally by these Terms of Service. These terms constitute a legally binding agreement between you and SAMENTHWELL LTD. If you do not agree to all of these terms, you are expressly prohibited from using our services and must discontinue use immediately.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">
								2. Description of Service
							</h2>
							<p className="text-slate-300 leading-relaxed">
								Cloudbase provides cloud infrastructure services including VPS
								hosting, managed Kubernetes, GPU servers, database hosting, and
								game server hosting built on DigitalOcean infrastructure.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">
								3. User Responsibilities and Acceptable Use
							</h2>
							<p className="text-slate-300 leading-relaxed mb-4">
								As a core condition of your use of our services, you strictly agree to:
							</p>
							<ul className="list-disc list-inside text-slate-300 space-y-2">
								<li>Provide and maintain accurate, current, and complete account information.</li>
								<li>Safeguard and maintain the strict confidentiality of your account credentials.</li>
								<li>Use our services only in full compliance with all applicable local, national, and international laws and regulations.</li>
								<li>Refrain from using the services for any illegal, malicious, or abusive activities, including but not limited to spamming, hosting malware, or unauthorized access to other systems.</li>
								<li>Promptly pay all applicable fees according to our pricing and billing terms.</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">
								4. Service Level Agreement
							</h2>
							<p className="text-slate-300 leading-relaxed">
								We guarantee 99.9% uptime for all services. If we fail to meet
								this SLA, you may be eligible for service credits as outlined in
								our SLA documentation.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">5. Billing, Payments and Service Suspension</h2>
							<p className="text-slate-300 leading-relaxed mb-4">
								Cloudbase operates on a prepaid, credit-based billing model:
							</p>
							<ul className="list-disc list-inside text-slate-300 space-y-2 leading-relaxed">
								<li><strong className="text-white">Credit Usage:</strong> Accrued service fees for active instances and resources are deducted continually and automatically directly from the user's internal account balance (credits/tokens).</li>
								<li><strong className="text-white">Account Funding:</strong> Users bear the sole responsibility for monitoring their consumption and manually topping up their internal account balance to prevent service disruption.</li>
								<li><strong className="text-white">Payment Processing:</strong> All transactions are securely processed through designated third-party payment gateways. You agree to provide valid and updated payment information.</li>
								<li><strong className="text-white">Zero-Balance Service Suspension:</strong> If the internal balance reaches zero or is insufficient to cover the ongoing accrued service fees, active services and server instances will be automatically suspended without further notice. Suspended services may eventually be permanently deleted if the account is not sufficiently replenished within the specified grace period.</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">6. Strict No-Refund Policy</h2>
							<p className="text-slate-300 leading-relaxed mb-4">
								<strong className="text-white">No-Refund Policy for Digital Goods and Cloud Credits:</strong>
							</p>
							<ul className="list-disc list-inside text-slate-300 space-y-2 leading-relaxed">
								<li><strong className="text-white">Final Sales:</strong> Due to the immediate delivery and consumable nature of digital services, cloud computing resources, and account credits, all sales and top-ups are strictly final.</li>
								<li><strong className="text-white">Completion of Transaction:</strong> Once funds have been deposited to purchase internal account credits, the transaction is considered instantly and fully completed.</li>
								<li><strong className="text-white">Non-Returnable & Non-Refundable:</strong> Because account credits and digital services are intangible electronic goods which are allocated to your account upon purchase, they cannot be "returned." Consequently, absolutely no refunds, partial refunds, or credit withdrawals will be issued to your payment method under any circumstances, including but not limited to account termination, accidental purchases, or non-usage of credits.</li>
							</ul>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">7. Termination</h2>
							<p className="text-slate-300 leading-relaxed">
								Either party may terminate the agreement at any time. Upon
								termination, your access to services will be suspended and data
								may be deleted after a 30-day grace period.
							</p>
						</section>

						<section>
							<h2 className="text-2xl font-bold mb-4">
								8. Limitation of Liability
							</h2>
							<p className="text-slate-300 leading-relaxed">
								Cloudbase shall not be liable for any indirect, incidental, or
								consequential damages arising from your use of our services. Our
								total liability shall not exceed the fees paid in the 12 months
								preceding the claim.
							</p>
						</section>
					</div>
				</div>
			</section>
		</>
	);
}
