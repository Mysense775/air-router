import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Sidebar from './Sidebar'
import Header from './Header'
import { PageTransition } from './PageTransition'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-[20px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header user={user} onLogout={logout} />
        <main id="main-content" className="flex-1 p-6 overflow-auto lg:pt-6 pt-16" tabIndex={-1}>
          <PageTransition key={location.pathname}>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
