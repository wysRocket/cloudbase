import { useState, useEffect } from 'react'

export default function CustomCursor() {
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handleMouseMove = (e) => {
            setPosition({ x: e.clientX, y: e.clientY })
            if (!isVisible) setIsVisible(true)
        }

        const handleMouseEnter = () => setIsVisible(true)
        const handleMouseLeave = () => setIsVisible(false)

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseenter', handleMouseEnter)
        document.addEventListener('mouseleave', handleMouseLeave)

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseenter', handleMouseEnter)
            document.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [isVisible])

    if (!isVisible) return null

    return (
        <>
            <div
                className="cursor-dot"
                style={{
                    left: position.x - 6,
                    top: position.y - 6,
                }}
            />
            <div
                className="cursor-ring"
                style={{
                    left: position.x - 20,
                    top: position.y - 20,
                }}
            />
        </>
    )
}
