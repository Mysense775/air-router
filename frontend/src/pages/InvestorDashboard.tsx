import { useQuery } from '@tanstack/react-query'
import { 
  TrendingUp, 
  Wallet, 
  Key,
  DollarSign,
  ArrowUpRight,
  Plus
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { api } from '../api/client'
import { Link } from 'react-router-dom'

interface DashboardData {
  total_accounts: number
  total_invested: number
  total_earned: number
  current_month_earned: number
  accounts: Array<{
    id: string
    name: string
    initial_balance: number
    current_balance: number
    total_earned: number
    status: string
  }>
}

export default function InvestorDashboard() {
  const { t } = useTranslation()
  
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['investor-dashboard'],
    queryFn: async () => {
      const response = await api.get('/investor/dashboard')
      return response.data
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const stats = [
    {
      title: t('investor.totalInvested') || 'Всего инвестировано',
      value: `$${(data?.total_invested || 0).toFixed(2)}`,
      icon: Wallet,
      color: 'blue'
    },
    {
      title: t('investor.totalEarned') || 'Всего заработано',
      value: `$${(data?.total_earned || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: t('investor.thisMonth') || 'В этом месяце',
      value: `$${(data?.current_month_earned || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'purple'
    },
    {
      title: t('investor.activeKeys') || 'Активные ключи',
      value: data?.total_accounts || 0,
      icon: Key,
      color: 'orange'
    }
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('investor.dashboardTitle') || 'Инвесторский дашборд'}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('investor.dashboardSubtitle') || 'Управляйте вашими инвестициями и следите за доходом'}
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('investor.myAccounts') || 'Мои аккаунты'}
          </h2>
        </div>
        
        {data?.accounts && data.accounts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data.accounts.map((account) => (
              <div key={account.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    account.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-sm text-gray-500">
                      {t('investor.initial') || 'Начальный'}: ${account.initial_balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${account.current_balance.toFixed(2)}</p>
                  <p className="text-sm text-green-600">
                    +${account.total_earned.toFixed(2)} {t('investor.earned') || 'заработано'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('investor.noAccounts') || 'Нет аккаунтов'}</p>
            <Link
              to="/investor/keys/add"
              className="inline-flex items-center gap-2 mt-4 text-green-600 hover:text-green-700"
            >
              {t('investor.addFirst') || 'Добавить первый ключ'}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
