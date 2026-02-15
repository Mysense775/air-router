import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, 
  Pause, 
  Play, 
  Trash2,
  RefreshCw,
  DollarSign,
  User
} from 'lucide-react'
import { adminApi } from '../../api/client'

interface InvestorAccount {
  id: string
  user_email: string
  user_name: string
  name: string
  initial_balance: number
  current_balance: number
  min_threshold: number
  total_earned: number
  total_spent: number
  status: string
  created_at: string
  last_sync_at: string | null
}

export default function InvestorKeysManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [minBalance, setMinBalance] = useState<string>('')

  const { data: accounts, isLoading } = useQuery<InvestorAccount[]>({
    queryKey: ['admin-investor-accounts', statusFilter, search, minBalance],
    queryFn: async () => {
      const response = await adminApi.getInvestorAccounts({
        status: statusFilter || undefined,
        search: search || undefined,
        min_balance: minBalance ? parseFloat(minBalance) : undefined,
        limit: 50
      })
      return response.data
    }
  })

  const pauseMutation = useMutation({
    mutationFn: adminApi.pauseInvestorAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-investor-accounts'] })
  })

  const activateMutation = useMutation({
    mutationFn: adminApi.activateInvestorAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-investor-accounts'] })
  })

  const revokeMutation = useMutation({
    mutationFn: adminApi.revokeInvestorAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-investor-accounts'] })
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'paused': return 'bg-yellow-100 text-yellow-700'
      case 'revoked': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активен'
      case 'paused': return 'Приостановлен'
      case 'revoked': return 'Отозван'
      default: return status
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Управление инвесторскими ключами</h3>
          <span className="text-sm text-gray-500">
            Всего: {accounts?.length || 0}
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по email или названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все статусы</option>
            <option value="active">Активен</option>
            <option value="paused">Приостановлен</option>
            <option value="revoked">Отозван</option>
          </select>

          <input
            type="number"
            placeholder="Мин. баланс"
            value={minBalance}
            onChange={(e) => setMinBalance(e.target.value)}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Инвестор</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ключ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Баланс</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заработано</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : accounts?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Нет инвесторских ключей
                </td>
              </tr>
            ) : (
              accounts?.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{account.user_name || '—'}</p>
                        <p className="text-sm text-gray-500">{account.user_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-xs text-gray-500">ID: {account.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">${account.current_balance.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      из ${account.initial_balance.toFixed(2)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-600 font-medium">
                      +${account.total_earned.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(account.status)}`}>
                      {getStatusText(account.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {account.status === 'active' && (
                        <button
                          onClick={() => pauseMutation.mutate(account.id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="Приостановить"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {account.status === 'paused' && (
                        <button
                          onClick={() => activateMutation.mutate(account.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Активировать"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {account.status !== 'revoked' && (
                        <button
                          onClick={() => {
                            if (confirm('Отозвать ключ? Это действие нельзя отменить.')) {
                              revokeMutation.mutate(account.id)
                            }
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Отозвать"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
