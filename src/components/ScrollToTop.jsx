import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
    const { pathname, hash } = useLocation()

    useLayoutEffect(() => {
        // Disable browser's default scroll restoration
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual'
        }

        // Only scroll to top if there is no hash in the URL
        if (!hash) {
            window.scrollTo(0, 0)
        }
    }, [pathname, hash])

    return null
}
