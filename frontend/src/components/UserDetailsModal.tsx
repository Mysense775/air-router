import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/client'
import {
  X,
  User,
  Mail,
  Shield,
  Clock,
  DollarSign,
  Key,
  Activity,
  CreditCard,
  LogIn,
  Edit3,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface UserDetailsModalProps {
  userId: string | null
  onClose: () => void
}

interface UserDetails {
  user: {
    id: string
    email: string
    name?: string
    role: string
    status: string
    email_verified: boolean
    created_at: string
    updated_at: string
  }
  balance: {
    balance_usd: number
    lifetime_spent: number
    lifetime_earned: number
    lifetime_savings: number
    last_deposit_at?: string
  } | null
  api_keys: Array<{
    id: string
    name: string
    allowed_model?: string
    is_active: boolean
    last_used_at?: string
    created_at: string
  }>
  recent_requests: Array<{
    id: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    cost_to_client_usd: number
    status: string
    created_at: string
  }>
  recent_deposits: Array<{
    id: string
    amount_usd: number
    currency: string
    payment_method: string
    status: string
    created_at: string
  }>
  stats: {
    total_requests: number
    total_spent: number
    total_tokens: number
    total_deposits: number
  }
}

export default function UserDetailsModal({ userId, onClose }: UserDetailsModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'info' | 'keys' | 'requests' | 'deposits'>('info')
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')

  const { data, isLoading, error } = useQuery<UserDetails>({
    queryKey: ['admin-user-details', userId],
    queryFn: async () => {
      if (!userId) return null
      const response = await adminApi.getUserDetails(userId)
      return response.data
    },
    enabled: !!userId,
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-details', userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] })
      setShowRoleModal(false)
    },
  })

  const impersonateMutation = useMutation({
    mutationFn: (id: string) => adminApi.impersonateUser(id),
    onSuccess: (response) => {
      // Store impersonated token and redirect
      localStorage.setItem('impersonated_token', response.data.access_token)
      localStorage.setItem('original_token', localStorage.getItem('token') || '')
      localStorage.setItem('token', response.data.access_token)
      window.location.href = response.data.user.role === 'admin' ? '/admin' : '/dashboard'
    },
  })

  const addBalanceMutation = useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason?: string }) =>
      adminApi.addUserBalance(id, amount, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-details', userId] })
      setShowBalanceModal(false)
      setBalanceAmount('')
      setBalanceReason('')
    },
  })

  if (!userId) return null

  const user = data?.user
  const balance = data?.balance
  const stats = data?.stats

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700'
      case 'investor': return 'bg-purple-100 text-purple-700'
      default: return 'bg-blue-100 text-blue-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'inactive': return 'bg-gray-100 text-gray-700'
      default: return 'bg-yellow-100 text-yellow-700'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {user?.name?.[0] || user?.email?.[0] || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user?.name || 'Пользователь'}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => impersonateMutation.mutate(userId)}
              disabled={impersonateMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {impersonateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Войти как пользователь
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex gap-6">
            {[
              { id: 'info', label: 'Информация', icon: User },
              { id: 'keys', label: 'API Ключи', icon: Key },
              { id: 'requests', label: 'Запросы', icon: Activity },
              { id: 'deposits', label: 'Пополнения', icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              <AlertCircle className="w-6 h-6 mr-2" />
              Ошибка загрузки
            </div>
          ) : activeTab === 'info' ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">Баланс</p>
                  <p className="text-2xl font-bold text-blue-900">${balance?.balance_usd.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 mb-1">Пополнено</p>
                  <p className="text-2xl font-bold text-green-900">${stats?.total_deposits.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 mb-1">Запросов</p>
                  <p className="text-2xl font-bold text-purple-900">{stats?.total_requests || 0}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <p className="text-sm text-orange-600 mb-1">Потрачено</p>
                  <p className="text-2xl font-bold text-orange-900">${stats?.total_spent.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {/* User Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">ID</span>
                  <span className="font-mono text-sm">{user?.id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Email</span>
                  <span>{user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Роль</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user?.role || '')}`}>
                      {user?.role}
                    </span>
                    <button
                      onClick={() => {
                        setNewRole(user?.role || 'client')
                        setShowRoleModal(true)
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit3 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Статус</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user?.status || '')}`}>
                    {user?.status}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Email подтверждён</span>
                  <span>{user?.email_verified ? 'Да' : 'Нет'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-500">Создан</span>
                  <span>{user?.created_at ? new Date(user.created_at).toLocaleString('ru-RU') : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500">Обновлён</span>
                  <span>{user?.updated_at ? new Date(user.updated_at).toLocaleString('ru-RU') : '—'}</span>
                </div>
              </div>

              {/* Balance Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBalanceModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <DollarSign className="w-4 h-4" />
                  Добавить баланс
                </button>
              </div>
            </div>
          ) : activeTab === 'keys' ? (
            <div className="space-y-3">
              {data?.api_keys.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Нет API ключей</p>
              ) : (
                data?.api_keys.map((key) => (
                  <div key={key.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-sm text-gray-500">
                        {key.allowed_model || 'Все модели'} • Создан: {new Date(key.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${key.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {key.is_active ? 'Активен' : 'Отключён'}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'requests' ? (
            <div className="space-y-2">
              {data?.recent_requests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Нет запросов</p>
              ) : (
                <table className="w-full">
                  <thead className="text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="py-2">Дата</th>
                      <th className="py-2">Модель</th>
                      <th className="py-2">Токены</th>
                      <th className="py-2">Стоимость</th>
                      <th className="py-2">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.recent_requests.map((req) => (
                      <tr key={req.id}>
                        <td className="py-2 text-sm">{new Date(req.created_at).toLocaleString('ru-RU')}</td>
                        <td className="py-2 text-sm font-mono">{req.model}</td>
                        <td className="py-2 text-sm">{req.prompt_tokens + req.completion_tokens}</td>
                        <td className="py-2 text-sm">${req.cost_to_client_usd.toFixed(4)}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${req.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {data?.recent_deposits.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Нет пополнений</p>
              ) : (
                <table className="w-full">
                  <thead className="text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="py-2">Дата</th>
                      <th className="py-2">Сумма USD</th>
                      <th className="py-2">Валюта</th>
                      <th className="py-2">Метод</th>
                      <th className="py-2">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data?.recent_deposits.map((dep) => (
                      <tr key={dep.id}>
                        <td className="py-2 text-sm">{new Date(dep.created_at).toLocaleString('ru-RU')}</td>
                        <td className="py-2 text-sm font-semibold">${dep.amount_usd.toFixed(2)}</td>
                        <td className="py-2 text-sm">{dep.currency}</td>
                        <td className="py-2 text-sm">{dep.payment_method}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            dep.status === 'completed' ? 'bg-green-100 text-green-700' :
                            dep.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {dep.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Изменить роль</h3>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg"
            >
              <option value="client">Client (Клиент)</option>
              <option value="admin">Admin (Администратор)</option>
              <option value="investor">Investor (Инвестор)</option>
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={() => updateRoleMutation.mutate({ id: userId!, role: newRole })}
                disabled={updateRoleMutation.isPending}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {updateRoleMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Balance Modal */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">Добавить баланс</h3>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Сумма (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                placeholder="100.00"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Причина (опционально)</label>
              <input
                type="text"
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                placeholder="Бонус, компенсация..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBalanceModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={() => addBalanceMutation.mutate({
                  id: userId!,
                  amount: parseFloat(balanceAmount),
                  reason: balanceReason
                })}
                disabled={addBalanceMutation.isPending || !balanceAmount || parseFloat(balanceAmount) <= 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {addBalanceMutation.isPending ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
