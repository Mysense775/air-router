import { Link, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n'
import {
  LayoutDashboard,
  Key,
  BarChart3,
  Wallet,
  Settings,
  LogOut,
  Globe,
  BookOpen,
} from 'lucide-react'

interface InvestorLayoutProps {
  children: React.ReactNode
}

export default function InvestorLayout({ children }: InvestorLayoutProps) {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { language, toggleLanguage, t } = useTranslation()

  // Проверяем роль
  if (user?.role !== 'investor') {
    return <Navigate to="/dashboard" />
  }

  const menuItems = [
    { path: '/investor', icon: LayoutDashboard, label: t('investor.dashboard') || 'Главная' },
    { path: '/investor/flow', icon: BookOpen, label: t('investor.flow') || 'Схема заработка' },
    { path: '/investor/keys', icon: Key, label: t('investor.keys') || 'Мои ключи' },
    { path: '/investor/stats', icon: BarChart3, label: t('investor.stats') || 'Статистика' },
    { path: '/investor/payouts', icon: Wallet, label: t('investor.payouts') || 'Выплаты' },
    { path: '/investor/settings', icon: Settings, label: t('investor.settings') || 'Настройки' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 p-2 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">AI Router</h2>
              <p className="text-xs text-green-700 font-medium">{t('investor.title') || 'Инвестор'}</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  isActive
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {/* Language */}
          <button
            onClick={toggleLanguage}
            aria-label="Переключить язык"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <Globe className="w-5 h-5" aria-hidden="true" />
            <span>{language === 'ru' ? 'Русский' : 'English'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            aria-label={t('navigation.logout') || 'Выйти'}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            <span>{t('navigation.logout') || 'Выйти'}</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
