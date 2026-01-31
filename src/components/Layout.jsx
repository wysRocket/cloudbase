import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout({ children }) {
    return (
        <>
            <div className="noise-overlay"></div>
            <Navbar />
            <main>
                {children}
            </main>
            <Footer />
        </>
    )
}
