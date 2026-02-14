import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard,
  Shield,
  Users,
} from 'lucide-react'

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuthStore()

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
        {user?.role === 'admin' && (
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
              <span className="font-medium">Dashboard</span>
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
              <span className="font-medium">Users</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-sm font-medium mb-1">Admin Panel</p>
          <p className="text-xs opacity-90">v1.2.0</p>
        </div>
      </div>
    </aside>
  )
}
