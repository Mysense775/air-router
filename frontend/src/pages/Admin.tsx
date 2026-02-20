import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Plus, RefreshCw, RefreshCcw, Bug } from 'lucide-react'
import * as Sentry from '@sentry/react'

interface Stats {
  total_users: number
  total_requests_today: number
  revenue_today: number
  profit_today: number
}

interface MasterAccount {
  id: string
  name: string
  balance_usd: number
  discount_percent: number
  is_active: boolean
  priority: number
  monthly_limit_usd: number | null
  monthly_used_usd: number
}

interface User {
  id: string
  email: string
  name: string
  role: string
  status: string
  created_at: string
}

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [accounts, setAccounts] = useState<MasterAccount[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    api_key: '',
    discount_percent: 70,
    monthly_limit_usd: '',
    priority: 0
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [syncing, setSyncing] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, accountsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/master-accounts'),
        api.get('/admin/clients'),
      ])
      setStats(statsRes.data)
      // Отладка структуры ответа
      console.log('Accounts response:', accountsRes.data)
      const accountsData = accountsRes.data.accounts || accountsRes.data || []
      setAccounts(Array.isArray(accountsData) ? accountsData : [])
      setUsers(usersRes.data.clients || [])
    } catch (err: any) {
      console.error('Admin fetch error:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to load admin data'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const data = {
        ...formData,
        monthly_limit_usd: formData.monthly_limit_usd ? parseFloat(formData.monthly_limit_usd) : null
      }
      await api.post('/admin/master-accounts', data)
      setSuccess('Master account created successfully!')
      setFormData({ name: '', api_key: '', discount_percent: 70, monthly_limit_usd: '', priority: 0 })
      setShowAddForm(false)
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create master account')
    } finally {
      setSubmitting(false)
    }
  }

  const syncBalance = async (accountId: string) => {
    // Проверка на валидный ID
    if (!accountId || accountId === 'undefined') {
      setError('Please select a valid master account')
      Sentry.captureMessage('Sync attempted with invalid account ID: ' + accountId, 'warning')
      return
    }

    setSyncing(accountId)
    setError('')
    setSuccess('')

    try {
      const res = await api.post(`/admin/master-accounts/${accountId}/sync`)
      setSuccess(`Balance synced: $${res.data.balance_usd.toFixed(2)}`)
      fetchData()
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to sync balance'
      setError(errorMsg)
      Sentry.captureException(err, {
        extra: {
          accountId,
          errorMessage: errorMsg,
          context: 'syncBalance'
        }
      })
    } finally {
      setSyncing(null)
    }
  }

  // Debug function to test Sentry
  const testSentry = () => {
    try {
      throw new Error('Test error for Sentry debugging')
    } catch (err) {
      Sentry.captureException(err, {
        extra: { context: 'Admin panel test' }
      })
      alert('Test error sent to Sentry. Check console.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-[20px] p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-2xl font-bold text-gray-900">{stats?.total_users || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">Requests Today</div>
          <div className="text-2xl font-bold text-blue-600">{stats?.total_requests_today || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">Revenue Today</div>
          <div className="text-2xl font-bold text-green-600">
            ${stats?.revenue_today?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="bg-white p-6 rounded-[20px] shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600">Profit Today</div>
          <div className="text-2xl font-bold text-purple-600">
            ${stats?.profit_today?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      {/* Master Accounts */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">OpenRouter Master Accounts</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={testSentry}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-[20px] transition-colors"
              title="Test Sentry error tracking"
            >
              <Bug className="w-4 h-4" />
              Debug
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-[20px] hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Account
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Add New Master Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Primary Account"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="sk-or-v1-..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit (USD)</label>
                  <input
                    type="number"
                    value={formData.monthly_limit_usd}
                    onChange={(e) => setFormData({ ...formData, monthly_limit_usd: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-[20px] hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Monthly Used</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-600">
                    No master accounts configured
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td className="px-6 py-4 font-medium text-gray-900">{acc.name}</td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${acc.balance_usd < 10 ? 'text-red-600' : 'text-green-600'}`}>
                        ${acc.balance_usd?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      ${acc.monthly_used_usd?.toFixed(2)}
                      {acc.monthly_limit_usd && (
                        <span className="text-xs text-gray-600 ml-1">
                          / ${acc.monthly_limit_usd?.toFixed(0)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{acc.discount_percent}%</td>
                    <td className="px-6 py-4 text-gray-600">{acc.priority}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        acc.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {acc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => syncBalance(acc.id)}
                        disabled={syncing === acc.id}
                        aria-label={`Sync balance for ${acc.name}`}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-[20px] transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <RefreshCcw className={`w-4 h-4 ${syncing === acc.id ? 'animate-spin' : ''}`} aria-hidden="true" />
                        {syncing === acc.id ? 'Syncing...' : 'Sync'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-600">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 font-medium text-gray-900">{user.email}</td>
                    <td className="px-6 py-4 text-gray-600">{user.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
