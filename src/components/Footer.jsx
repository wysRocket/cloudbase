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
                        <div className="flex gap-8 items-center">
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-500 uppercase tracking-wider">We Accept:</span>
                                <div className="flex gap-3 items-center">
                                    <svg className="h-8 w-auto opacity-80" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="48" height="32" rx="4" fill="#1A1F71"/>
                                        <text x="24" y="20" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">VISA</text>
                                    </svg>
                                    <svg className="h-8 w-auto opacity-80" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="48" height="32" rx="4" fill="#EB001B"/>
                                        <circle cx="18" cy="16" r="8" fill="#FF5F00"/>
                                        <circle cx="30" cy="16" r="8" fill="#F79E1B"/>
                                    </svg>
                                    <svg className="h-8 w-auto opacity-80" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="48" height="32" rx="4" fill="white" stroke="#E5E7EB"/>
                                        <text x="24" y="14" fontSize="7" fill="#5F6368" textAnchor="middle" fontWeight="600">Google</text>
                                        <text x="24" y="22" fontSize="7" fill="#5F6368" textAnchor="middle" fontWeight="600">Pay</text>
                                    </svg>
                                    <svg className="h-8 w-auto" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect width="48" height="32" rx="4" fill="black"/>
                                        <path d="M16.5 13.5c-.2-.8-.3-1.5-.3-2 0-.5.1-.9.2-1.3.3-.8.8-1.5 1.5-2 .7-.5 1.5-.8 2.4-.8.4 0 .8.1 1.2.2.4.2.7.4.9.6.2.2.3.4.3.7 0 .2-.1.5-.3.7-.2.2-.4.3-.7.3-.1 0-.3 0-.5-.1-.2-.1-.4-.2-.6-.3-.2-.1-.5-.2-.8-.2-.5 0-.9.2-1.2.5-.3.3-.5.8-.5 1.3 0 .4.1.9.2 1.4l2.8 8.8c.1.2.1.4.1.5 0 .3-.1.5-.3.7-.2.2-.4.3-.7.3-.2 0-.4-.1-.6-.2-.2-.1-.3-.3-.4-.6l-1.5-4.8h-3l-1.5 4.8c-.1.3-.2.5-.4.6-.2.1-.4.2-.6.2-.3 0-.5-.1-.7-.3-.2-.2-.3-.4-.3-.7 0-.1 0-.3.1-.5l2.8-8.8zm9.2 8.3c-.2-.2-.3-.4-.3-.7 0-.1 0-.3.1-.5l2.8-8.8c.1-.5.1-1 .2-1.4 0-.5-.2-1-.5-1.3-.3-.3-.7-.5-1.2-.5-.3 0-.6.1-.8.2-.2.1-.4.2-.6.3-.2.1-.3.1-.5.1-.3 0-.5-.1-.7-.3-.2-.2-.3-.4-.3-.7 0-.3.1-.5.3-.7.2-.2.5-.4.9-.6.4-.2.8-.2 1.2-.2.9 0 1.7.3 2.4.8.7.5 1.2 1.2 1.5 2 .1.4.2.8.2 1.3 0 .5-.1 1.2-.3 2l-2.8 8.8c-.1.3-.2.5-.4.6-.2.1-.4.2-.6.2-.3 0-.5-.1-.7-.3z" fill="white"/>
                                        <text x="32" y="21" fontSize="9" fill="white" fontWeight="700">Pay</text>
                                    </svg>
                                </div>
                            </div>
                            <img
                                src="/images/image-7.png"
                                className="h-10 w-auto"
                                alt="DigitalOcean Partner"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
