import Navbar from './Navbar'
import Footer from './Footer'
import SmoothScroll from './SmoothScroll'

export default function Layout({ children }) {
    return (
        <>
            <SmoothScroll />
            <div className="noise-overlay"></div>
            <Navbar />
            <main>
                {children}
            </main>
            <Footer />
        </>
    )
}
