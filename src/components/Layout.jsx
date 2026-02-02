import Navbar from './Navbar'
import Footer from './Footer'
import CustomCursor from './CustomCursor'
import SmoothScroll from './SmoothScroll'

export default function Layout({ children }) {
    return (
        <>
            <SmoothScroll />
            <CustomCursor />
            <div className="noise-overlay"></div>
            <Navbar />
            <main>
                {children}
            </main>
            <Footer />
        </>
    )
}
