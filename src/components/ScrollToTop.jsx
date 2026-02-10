import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
    const { pathname, hash } = useLocation()

    useLayoutEffect(() => {
        // Disable browser's default scroll restoration
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual'
        }

        if (hash) {
            // If there's a hash, scroll to that element
            setTimeout(() => {
                const id = hash.replace('#', '')
                const element = document.getElementById(id)
                if (element) {
                    const offset = 80 // Navbar height
                    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
                    const offsetPosition = elementPosition - offset

                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
                }
            }, 100)
        } else {
            // Scroll to top if no hash - force immediate scroll
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

            // Double-tap to ensure it works
            requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
            })
        }
    }, [pathname, hash])

    return null
}
