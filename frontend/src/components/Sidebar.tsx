import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n'
import {
  LayoutDashboard,
  Shield,
  Users,
  Key,
  CreditCard,
  History,
  Brain,
  Globe,
  Book,
  Receipt,
  Menu,
  X,
  MessageCircle,
} from 'lucide-react'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { language, toggleLanguage, t } = useTranslation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-[20px]">
            <LayoutDashboard className="w-4 h-4 text-white" aria-hidden={true} />
          </div>
          <h2 className="font-bold text-gray-900">AI Router</h2>
        </div>
        <button
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={isMobileMenuOpen}
          className="p-2 rounded-[20px] text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
          aria-hidden={true}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 lg:transform-none ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-[20px]">
            <LayoutDashboard className="w-4 h-4 text-white" aria-hidden={true} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">AI Router</h2>
            <p className="text-xs text-gray-600">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {user?.role === 'admin' ? (
          // Admin navigation
          <>
            <Link
              to="/admin"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/admin' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                location.pathname === '/admin'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.admin')}</span>
            </Link>
            <Link
              to="/admin/users"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/admin/users' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                location.pathname === '/admin/users'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.users')}</span>
            </Link>
            <Link
              to="/admin/transactions"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/admin/transactions' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                location.pathname === '/admin/transactions'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Receipt className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.transactions')}</span>
            </Link>
          </>
        ) : (
          // Client navigation
          <>
            <Link
              to="/dashboard"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                location.pathname === '/dashboard'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.dashboard')}</span>
            </Link>
            <Link
              to="/deposit"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/deposit' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                location.pathname === '/deposit'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.deposit')}</span>
            </Link>
            <Link
              to="/api-keys"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/api-keys' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                location.pathname === '/api-keys'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Key className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.apiKeys')}</span>
            </Link>
            <Link
              to="/requests"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/requests' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                location.pathname === '/requests'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <History className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.requestHistory')}</span>
            </Link>
            <Link
              to="/models"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/models' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                location.pathname === '/models'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Brain className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.models')}</span>
            </Link>
            <Link
              to="/docs"
              onClick={closeMobileMenu}
              aria-current={location.pathname === '/docs' ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                location.pathname === '/docs'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Book className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.docs')}</span>
            </Link>
            <a
              href="https://t.me/ai_router_support_bot"
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 hover:bg-gray-50"
            >
              <MessageCircle className="w-4 h-4" aria-hidden={true} />
              <span className="font-medium">{t('navigation.support') || 'Поддержка'}</span>
            </a>
          </>
        )}
      </nav>

      {/* Language Switcher */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={toggleLanguage}
          aria-label="Переключить язык"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-[20px] text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Globe className="w-4 h-4" aria-hidden={true} />
          <span className="font-medium">{language === 'en' ? 'English' : 'Русский'}</span>
          <span className="ml-auto text-xs text-gray-600">
            {language === 'en' ? 'RU' : 'EN'}
          </span>
        </button>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-white/80 backdrop-blur-md border border-blue-200 rounded-[20px] p-4 text-blue-700 transition-all duration-300 hover:bg-blue-50/90 hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]">
          <p className="text-sm font-medium mb-1">
            {user?.role === 'admin' ? 'Admin Panel' : 'Client Portal'}
          </p>
          <p className="text-xs text-blue-600/80">v1.2.0</p>
        </div>
      </div>
    </aside>

    </>
  )
}
