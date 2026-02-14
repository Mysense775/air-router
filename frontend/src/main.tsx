import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import App from './App'
import SentryErrorBoundary from './components/SentryErrorBoundary'
import './index.css'

// Initialize Sentry for error tracking
Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0', // Replace with your actual Sentry DSN
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 1.0,
  environment: 'production',
  beforeSend(event) {
    // Log to console for debugging
    if (event.exception) {
      console.error('🚨 Sentry captured error:', event.exception)
    }
    return event
  },
})

// Expose Sentry to window for debugging
;(window as any).Sentry = Sentry

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </SentryErrorBoundary>
  </React.StrictMode>,
)
