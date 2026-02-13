import { Link } from 'react-router-dom'

const footerLinks = {
    company: [
        { name: 'About Us', href: '/about' },
        { name: 'Privacy Policy', href: '/privacy' },
        { name: 'Terms of Service', href: '/terms' },
        { name: 'Cookie Policy', href: '/cookies' },
    ],
    connect: [
        { name: 'Support Center', href: '/support' },
        { name: 'Contact Support', href: '/contact' },
    ],
    services: [
        { name: 'VPS Hosting', href: '/services/vps' },
        { name: 'Kubernetes', href: '/services/kubernetes' },
        { name: 'GPU Servers', href: '/services/gpu' },
        { name: 'Database', href: '/services/database' },
        { name: 'Game Servers', href: '/services/game-servers' },
    ]
}

export default function Footer() {
    return (
        <footer className="bg-black pt-32 pb-12 px-6">
            <div className="max-w-7xl mx-auto border-t border-white/10 pt-12">
                <div className="grid md:grid-cols-5 gap-12 mb-32">
                    <div className="col-span-2">
                        <h3 className="text-6xl md:text-[10rem] font-black tracking-tighter text-white opacity-10 select-none leading-none pointer-events-none">
                            WYSCLOUD
                        </h3>
                    </div>
                    <div>
                        <h6 className="text-cyan-400 font-mono text-sm uppercase mb-6 tracking-widest">Services</h6>
                        <ul className="space-y-4">
                            {footerLinks.services.map((link) => (
                                <li key={link.name}>
                                    <Link to={link.href} className="text-slate-500 hover:text-white transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h6 className="text-cyan-400 font-mono text-sm uppercase mb-6 tracking-widest">Company</h6>
                        <ul className="space-y-4">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link to={link.href} className="text-slate-500 hover:text-white transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h6 className="text-cyan-400 font-mono text-sm uppercase mb-6 tracking-widest">Connect</h6>
                        <ul className="space-y-4">
                            {footerLinks.connect.map((link) => (
                                <li key={link.name}>
                                    {link.href.startsWith('/') ? (
                                        <Link to={link.href} className="text-slate-500 hover:text-white transition-colors">
                                            {link.name}
                                        </Link>
                                    ) : (
                                        <a href={link.href} className="text-slate-500 hover:text-white transition-colors">
                                            {link.name}
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="flex flex-col gap-6 mb-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-sm text-slate-600">
                        <div className="flex flex-col gap-2">
                            <p>© 2026 WysCloudBase. All rights reserved.</p>
                            <p className="text-xs">WysCloudBase LLC | Registration: DE-12345678 | VAT: US-987654321</p>
                        </div>
                        <div className="flex flex-col gap-3 w-full md:w-auto">
                            <span className="text-xs text-slate-500 uppercase tracking-wider">We Accept:</span>
                            <div className="flex flex-wrap gap-3 items-center">
                                <img src="/images/visa.svg" className="h-8 w-auto opacity-80" alt="Visa" />
                                <img src="/images/mastercard.svg" className="h-8 w-auto opacity-80" alt="Mastercard" />
                                <img src="/images/google-pay.svg" className="h-8 w-auto opacity-80" alt="Google Pay" />
                                <img src="/images/apple-pay.svg" className="h-8 w-auto opacity-80" alt="Apple Pay" />
                                <img src="/images/digital-ocean.svg" className="h-8 w-auto opacity-80" alt="DigitalOcean Partner" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
