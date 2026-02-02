import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function MagneticButton({ to, children, className = '', variant = 'primary' }) {
    const ref = useRef(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })

    const handleMouseMove = (e) => {
        const { left, top, width, height } = ref.current.getBoundingClientRect()
        const x = e.clientX - (left + width / 2)
        const y = e.clientY - (top + height / 2)
        setPosition({ x: x * 0.3, y: y * 0.3 })
    }

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 })
    }

    const baseStyles = variant === 'primary'
        ? 'bg-white text-black font-bold hover:bg-cyan-400 hover:text-white'
        : 'glass text-white font-bold hover:bg-white/10'

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
        >
            <Link
                to={to}
                className={`px-8 py-4 rounded-full transition-all transform hover:scale-105 inline-block ${baseStyles} ${className}`}
            >
                {children}
            </Link>
        </motion.div>
    )
}
