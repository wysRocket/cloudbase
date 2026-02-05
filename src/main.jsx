import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
    throw new Error('Add your Clerk Publishable Key to the .env file')
}

function ClerkProviderWithRoutes({ children }) {
    const navigate = useNavigate()

    return (
        <ClerkProvider
            publishableKey={PUBLISHABLE_KEY}
            navigate={(to) => navigate(to)}
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
        >
            {children}
        </ClerkProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ClerkProviderWithRoutes>
                <App />
            </ClerkProviderWithRoutes>
        </BrowserRouter>
    </React.StrictMode>
)

