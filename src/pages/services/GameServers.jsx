import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function GameServers() {
    const games = [
        { name: 'Minecraft', icon: '⛏️', players: 'Up to 200', price: 5 },
        { name: 'Rust', icon: '🔫', players: 'Up to 300', price: 15 },
        { name: 'CS2', icon: '🎯', players: 'Up to 64', price: 10 },
        { name: 'ARK', icon: '🦖', players: 'Up to 100', price: 20 },
        { name: 'Valheim', icon: '⚔️', players: 'Up to 64', price: 8 },
        { name: 'Terraria', icon: '🌳', players: 'Up to 16', price: 5 },
    ]

    return (
        <>
            {/* Hero */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="aurora-blob w-[600px] h-[600px] bg-orange-500/20 top-0 right-0 animate-aurora"></div>
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="text-cyan-400 font-mono text-sm uppercase tracking-widest mb-4 block">Game Servers</span>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">
                            Low-Latency<br /><span className="text-cyan-400">Gaming</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mb-10">
                            Premium game server hosting with instant deployment. Minecraft, Rust, CS2, and more — optimized for gaming with DDoS protection included.
                        </p>
                        <div className="flex gap-4 flex-wrap">
                            <Link to="/contact" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded-full font-bold transition-all">
                                Start Gaming
                            </Link>
                            <Link to="/docs" className="px-8 py-4 glass rounded-full font-bold hover:bg-white/10 transition-all">
                                View All Games
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Game Selector */}
            <section className="py-20 px-6 bg-white/5">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Popular Games</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {games.map((game, i) => (
                            <div key={i} className="glass p-8 rounded-2xl hover:bg-white/10 transition-all group">
                                <span className="text-5xl mb-4 block group-hover:scale-110 transition-transform">{game.icon}</span>
                                <h3 className="text-2xl font-bold mb-2">{game.name}</h3>
                                <p className="text-slate-400 mb-4">{game.players} players</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-cyan-400">From ${game.price}/mo</span>
                                    <Link to="/contact" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-bold transition-all">
                                        Deploy
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold mb-12 text-center">Gaming Features</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { title: 'DDoS Protection', desc: 'Enterprise-grade protection', icon: '🛡️' },
                            { title: 'Instant Setup', desc: 'Server ready in 60 seconds', icon: '⚡' },
                            { title: 'Mod Support', desc: 'Easy mod installation', icon: '🔧' },
                            { title: 'Auto Backups', desc: 'Never lose your world', icon: '💾' },
                            { title: 'Global Locations', desc: '15+ datacenter regions', icon: '🌍' },
                            { title: 'FTP Access', desc: 'Full file management', icon: '📁' },
                            { title: '24/7 Support', desc: 'Help when you need it', icon: '💬' },
                            { title: 'Easy Panel', desc: 'Simple management UI', icon: '🖥️' },
                        ].map((f, i) => (
                            <div key={i} className="glass p-6 rounded-xl text-center hover:bg-white/10 transition-all">
                                <span className="text-3xl mb-2 block">{f.icon}</span>
                                <span className="font-bold block mb-1">{f.title}</span>
                                <span className="text-sm text-slate-400">{f.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6 bg-gradient-to-b from-transparent to-orange-900/20">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-6">Don&apos;t See Your Game?</h2>
                    <p className="text-slate-400 mb-8">We support 100+ games. Contact us for custom configurations.</p>
                    <Link to="/contact" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-cyan-400 hover:text-white transition-all inline-block">
                        Request a Game
                    </Link>
                </div>
            </section>
        </>
    )
}
