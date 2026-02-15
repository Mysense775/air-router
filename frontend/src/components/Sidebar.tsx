import { Link, useLocation } from 'react-router-dom'
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
} from 'lucide-react'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { language, toggleLanguage, t } = useTranslation()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">AI Router</h2>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {user?.role === 'admin' ? (
          // Admin navigation
          <>
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">{t('navigation.admin')}</span>
            </Link>
            <Link
              to="/admin/users"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/admin/users'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">{t('navigation.users')}</span>
            </Link>
            <Link
              to="/admin/transactions"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/admin/transactions'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span className="font-medium">{t('navigation.transactions')}</span>
            </Link>
          </>
        ) : (
          // Client navigation
          <>
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/dashboard'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">{t('navigation.dashboard')}</span>
            </Link>
            <Link
              to="/deposit"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/deposit'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">{t('navigation.deposit')}</span>
            </Link>
            <Link
              to="/api-keys"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/api-keys'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Key className="w-5 h-5" />
              <span className="font-medium">{t('navigation.apiKeys')}</span>
            </Link>
            <Link
              to="/requests"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/requests'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="font-medium">{t('navigation.requestHistory')}</span>
            </Link>
            <Link
              to="/models"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/models'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Brain className="w-5 h-5" />
              <span className="font-medium">{t('navigation.models')}</span>
            </Link>
            <Link
              to="/docs"
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                location.pathname === '/docs'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Book className="w-5 h-5" />
              <span className="font-medium">{t('navigation.docs')}</span>
            </Link>
          </>
        )}
      </nav>

      {/* Language Switcher */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Globe className="w-5 h-5" />
          <span className="font-medium">{language === 'en' ? 'English' : 'Русский'}</span>
          <span className="ml-auto text-xs text-gray-400">
            {language === 'en' ? 'RU' : 'EN'}
          </span>
        </button>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-sm font-medium mb-1">
            {user?.role === 'admin' ? 'Admin Panel' : 'Client Portal'}
          </p>
          <p className="text-xs opacity-90">v1.2.0</p>
        </div>
      </div>
    </aside>
  )
}
