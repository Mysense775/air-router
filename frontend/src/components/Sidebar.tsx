import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Key,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Key, label: 'API Keys', path: '/api-keys' },
  { icon: BarChart3, label: 'Usage', path: '/usage' },
  { icon: FileText, label: 'Docs', path: '/docs' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">AI Router</h2>
            <p className="text-xs text-gray-500">Reseller Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-sm font-medium mb-1">Need help?</p>
          <p className="text-xs opacity-90">Contact support@ai-router.com</p>
        </div>
      </div>
    </aside>
  )
}
