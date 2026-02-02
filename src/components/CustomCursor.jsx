import { useState, useEffect } from 'react'

export default function CustomCursor() {
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isHovered, setIsHovered] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const handleMouseMove = (e) => {
            setPosition({ x: e.clientX, y: e.clientY })
            if (!isVisible) setIsVisible(true)
        }

        const handleMouseEnter = () => setIsVisible(true)
        const handleMouseLeave = () => setIsVisible(false)

        const handleHoverStart = () => setIsHovered(true)
        const handleHoverEnd = () => setIsHovered(false)

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseenter', handleMouseEnter)
        document.addEventListener('mouseleave', handleMouseLeave)

        // Add hover detection for interactive elements
        const interactiveElements = document.querySelectorAll('a, button, [role="button"]')
        interactiveElements.forEach((el) => {
            el.addEventListener('mouseenter', handleHoverStart)
            el.addEventListener('mouseleave', handleHoverEnd)
        })

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseenter', handleMouseEnter)
            document.removeEventListener('mouseleave', handleMouseLeave)
            interactiveElements.forEach((el) => {
                el.removeEventListener('mouseenter', handleHoverStart)
                el.removeEventListener('mouseleave', handleHoverEnd)
            })
        }
    }, [isVisible])

    if (!isVisible) return null

    return (
        <>
            <div
                className={`cursor-dot ${isHovered ? 'hovered' : ''}`}
                style={{
                    left: position.x - 6,
                    top: position.y - 6,
                }}
            />
            <div
                className={`cursor-ring ${isHovered ? 'hovered' : ''}`}
                style={{
                    left: position.x - 20,
                    top: position.y - 20,
                }}
            />
        </>
    )
}
