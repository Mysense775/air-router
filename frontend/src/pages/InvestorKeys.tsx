import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Key,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { api } from '../api/client'
import { Link } from 'react-router-dom'

interface InvestorAccount {
  id: string
  name: string
  initial_balance: number
  current_balance: number
  min_threshold: number
  total_earned: number
  total_spent: number
  status: string
  created_at: string
}

export default function InvestorKeys() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: accounts, isLoading } = useQuery<InvestorAccount[]>({
    queryKey: ['investor-accounts'],
    queryFn: async () => {
      const response = await api.get('/investor/accounts')
      return response.data
    }
  })

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/investor/accounts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] })
    }
  })

  const copyToClipboard = (id: string) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('investor.keysTitle') || 'Мои ключи'}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('investor.keysSubtitle') || 'Управление инвесторскими ключами'}
          </p>
        </div>
        <Link
          to="/investor/keys/add"
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('investor.addKey') || 'Добавить ключ'}
        </Link>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">{t('investor.howItWorks') || 'Как это работает:'}</p>
          <p className="mt-1">
            {t('investor.howItWorksDesc') || 
              'Добавьте ваш OpenRouter API ключ. Клиенты будут использовать его для запросов. Вы получаете 1% от всех расходов через ваш ключ каждый месяц.'}
          </p>
        </div>
      </div>

      {/* Accounts List */}
      {accounts && accounts.length > 0 ? (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    account.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Key className={`w-6 h-6 ${
                      account.status === 'active' ? 'text-green-600' : 'text-gray-500'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{account.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        account.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {account.status === 'active' 
                          ? (t('investor.active') || 'Активен')
                          : (t('investor.revoked') || 'Отозван')
                        }
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      ID: {account.id.slice(0, 8)}...{account.id.slice(-4)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ${account.current_balance.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('investor.of') || 'из'} ${account.initial_balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">{t('investor.earned') || 'Заработано'}</p>
                  <p className="text-lg font-semibold text-green-600">
                    +${account.total_earned.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('investor.spent') || 'Потрачено'}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${account.total_spent.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('investor.minThreshold') || 'Мин. порог'}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${account.min_threshold.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {account.status === 'active' && (
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => copyToClipboard(account.id)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {copiedId === account.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        {t('common.copied') || 'Скопировано'}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        {t('investor.copyId') || 'Копировать ID'}
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm(t('investor.confirmRevoke') || 'Отозвать ключ? Он больше не будет использоваться.')) {
                        revokeMutation.mutate(account.id)
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('investor.revoke') || 'Отозвать'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <Key className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('investor.noKeys') || 'Нет ключей'}
          </h3>
          <p className="text-gray-500 mb-6">
            {t('investor.addKeyDesc') || 'Добавьте ваш первый OpenRouter API ключ'}
          </p>
          <Link
            to="/investor/keys/add"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('investor.addKey') || 'Добавить ключ'}
          </Link>
        </div>
      )}
    </div>
  )
}
