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
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 0)
        } else {
            // Scroll to top if no hash
            window.scrollTo(0, 0)
        }
    }, [pathname, hash])

    return null
}
