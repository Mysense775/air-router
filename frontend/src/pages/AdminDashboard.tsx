import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/client'
import { 
  Wallet, 
  Users, 
  CreditCard, 
  PiggyBank,
  TrendingUp,
  Plus,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Trash2
} from 'lucide-react'
import { 
  RevenueOverviewWidget, 
  AccountTypeRevenueWidget,
  ProfitDistributionChart,
  InvestorKeysManagement,
  SystemLoadChart,
  AverageClientSpendChart
} from '../components/admin'

interface MasterAccount {
  id: string
  name: string
  balance_usd: number
  discount_percent: number
  monthly_limit_usd: number | null
  monthly_used_usd: number
}

interface Client {
  id: string
  email: string
  name: string | null
  balance_usd: number
  status: string
  created_at: string
}

interface DashboardData {
  master_accounts: MasterAccount[]
  clients: Client[]
  total_clients: number
  total_clients_balance: number
  total_deposits: number
  manual_deposits: number
  payment_deposits: number
}

interface PoolStats {
  discounted: {
    count: number
    total_balance: number
    avg_balance: number
    status: string
  }
  regular: {
    count: number
    total_balance: number
    avg_balance: number
    status: string
  }
  strategy: string
  strategy_name: string
  total_available: number
}

interface Alert {
  level: string
  type: string
  message: string
  recommendation: string
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [newAccount, setNewAccount] = useState({
    name: '',
    api_key: '',
    account_type: 'discounted' as 'discounted' | 'regular',
    discount_percent: 70,
    monthly_limit_usd: '',
    priority: 0
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await adminApi.getDashboard()
      return res.data as DashboardData
    }
  })

  const { data: poolData } = useQuery({
    queryKey: ['master-pools'],
    queryFn: async () => {
      const res = await adminApi.getMasterAccountPools()
      return res.data as { pools: PoolStats; alerts: Alert[]; recommendations: string[] }
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof newAccount) =>
      adminApi.createMasterAccount({
        name: data.name,
        api_key: data.api_key,
        account_type: data.account_type,
        discount_percent: data.discount_percent,
        monthly_limit_usd: data.monthly_limit_usd ? parseFloat(data.monthly_limit_usd) : null,
        priority: data.priority
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      setIsModalOpen(false)
      setNewAccount({ name: '', api_key: '', account_type: 'discounted', discount_percent: 70, monthly_limit_usd: '', priority: 0 })
      setSuccess('Master account created successfully')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create master account')
    }
  })

  const [revokingId, setRevokingId] = useState<string | null>(null)

  const handleSync = async (accountId: string) => {
    setSyncingId(accountId)
    try {
      await adminApi.syncMasterAccount(accountId)
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      setSuccess('Balance synced successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to sync balance')
    } finally {
      setSyncingId(null)
    }
  }

  const handleRevoke = async (accountId: string, accountName: string) => {
    if (!confirm(`Are you sure you want to revoke master account "${accountName}"? This action cannot be undone.`)) {
      return
    }
    setRevokingId(accountId)
    try {
      await adminApi.revokeMasterAccount(accountId)
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      setSuccess(`Master account "${accountName}" revoked successfully`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke account')
    } finally {
      setRevokingId(null)
    }
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate(newAccount)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-32 animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Master Accounts Balance',
      value: data?.master_accounts.reduce((sum, acc) => sum + acc.balance_usd, 0) || 0,
      icon: Wallet,
      color: 'blue',
      suffix: 'USD'
    },
    {
      title: 'Total Clients Balance',
      value: data?.total_clients_balance || 0,
      icon: Users,
      color: 'green',
      suffix: 'USD'
    },
    {
      title: 'Total Deposits',
      value: data?.total_deposits || 0,
      icon: PiggyBank,
      color: 'purple',
      suffix: 'USD'
    },
    {
      title: 'Active Clients',
      value: data?.total_clients || 0,
      icon: CreditCard,
      color: 'orange',
      suffix: 'users'
    }
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and statistics</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500" />
          <p className="text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            purple: 'bg-purple-100 text-purple-600',
            orange: 'bg-orange-100 text-orange-600'
          }

          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stat.suffix === 'USD' ? formatCurrency(stat.value) : stat.value}
              </div>
              <div className="text-sm text-gray-500 mt-1">{stat.title}</div>
            </div>
          )
        })}
      </div>

      {/* Revenue Overview - New Widgets */}
      <RevenueOverviewWidget />

      {/* Account Types Revenue */}
      <AccountTypeRevenueWidget />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ProfitDistributionChart />
        <SystemLoadChart />
        <AverageClientSpendChart />
      </div>

      {/* Investor Keys Management */}
      <InvestorKeysManagement />

      {/* Pool Statistics */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Master Account Pools
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {poolData?.pools.strategy_name || 'Loading...'}
          </p>
        </div>

        {/* Alerts */}
        {poolData?.alerts && poolData.alerts.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 space-y-2">
            {poolData.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg flex items-start gap-3 ${
                  alert.level === 'emergency'
                    ? 'bg-red-100 border border-red-200'
                    : alert.level === 'critical'
                    ? 'bg-orange-100 border border-orange-200'
                    : 'bg-yellow-100 border border-yellow-200'
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    alert.level === 'emergency'
                      ? 'text-red-600'
                      : alert.level === 'critical'
                      ? 'text-orange-600'
                      : 'text-yellow-600'
                  }`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      alert.level === 'emergency'
                        ? 'text-red-800'
                        : alert.level === 'critical'
                        ? 'text-orange-800'
                        : 'text-yellow-800'
                    }`}
                  >
                    {alert.message}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{alert.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Discounted Pool */}
          <div
            className={`p-6 ${
              poolData?.pools.discounted.status === 'active'
                ? 'bg-green-50'
                : poolData?.pools.discounted.status === 'low'
                ? 'bg-yellow-50'
                : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Discounted Keys</h3>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  poolData?.pools.discounted.status === 'active'
                    ? 'bg-green-200 text-green-800'
                    : poolData?.pools.discounted.status === 'low'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {poolData?.pools.discounted.status === 'active'
                  ? 'Active'
                  : poolData?.pools.discounted.status === 'low'
                  ? 'Low'
                  : 'Empty'}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(poolData?.pools.discounted.total_balance || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Accounts</p>
                  <p className="text-lg font-medium text-gray-900">
                    {poolData?.pools.discounted.count || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Margin</p>
                  <p className="text-lg font-medium text-green-600">166%</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">Buy: -70% → Sell: -20%</p>
                <p className="text-xs text-green-600 font-medium">High Profit</p>
              </div>
            </div>
          </div>

          {/* Regular Pool */}
          <div
            className={`p-6 border-l border-gray-200 ${
              poolData?.pools.regular.status === 'active'
                ? 'bg-blue-50'
                : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Regular Keys</h3>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  poolData?.pools.regular.status === 'active'
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {poolData?.pools.regular.status === 'active' ? 'Reserve' : 'Empty'}
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(poolData?.pools.regular.total_balance || 0)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Accounts</p>
                  <p className="text-lg font-medium text-gray-900">
                    {poolData?.pools.regular.count || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Margin</p>
                  <p className="text-lg font-medium text-blue-600">5%</p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">Buy: 0% → Sell: +5%</p>
                <p className="text-xs text-blue-600 font-medium">Backup Only</p>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Indicator */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Current Strategy</p>
              <p className="text-sm text-gray-500">
                {poolData?.pools.strategy === 'discounted_first'
                  ? '🟢 Prioritizing high-margin accounts (166% profit)'
                  : poolData?.pools.strategy === 'regular_only'
                  ? '🟡 Using backup accounts only (5% profit)'
                  : '🔴 No accounts available!'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Available</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(poolData?.pools.total_available || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Master Accounts Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Master Accounts
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {data?.master_accounts.length || 0} accounts
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Master Key
            </button>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.master_accounts.map((account) => (
              <tr key={account.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900 font-medium">{account.name}</td>
                <td className="px-6 py-4">
                  <span className={`font-mono font-medium ${
                    account.balance_usd < 5 ? 'text-red-600' : 
                    account.balance_usd < 20 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(account.balance_usd)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{account.discount_percent}%</td>
                <td className="px-6 py-4">
                  {account.monthly_limit_usd ? (
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((account.monthly_used_usd / account.monthly_limit_usd) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        ${account.monthly_used_usd.toFixed(0)} / ${account.monthly_limit_usd.toFixed(0)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">No limit</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSync(account.id)}
                      disabled={syncingId === account.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 text-blue-700 rounded-lg text-sm transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncingId === account.id ? 'animate-spin' : ''}`} />
                      {syncingId === account.id ? 'Syncing...' : 'Sync'}
                    </button>
                    <button
                      onClick={() => handleRevoke(account.id, account.name)}
                      disabled={revokingId === account.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-red-700 rounded-lg text-sm transition-colors"
                    >
                      <Trash2 className={`w-4 h-4 ${revokingId === account.id ? 'animate-spin' : ''}`} />
                      {revokingId === account.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deposit Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">Manual Deposits</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data?.manual_deposits || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Added by admin</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">Payment Deposits</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data?.payment_deposits || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Via payment system</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PiggyBank className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">Total Deposits</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(data?.total_deposits || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
      </div>

      {/* Top Clients by Balance */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Top Clients by Balance
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.clients
              .sort((a, b) => b.balance_usd - a.balance_usd)
              .slice(0, 10)
              .map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{client.email}</td>
                  <td className="px-6 py-4 text-gray-600">{client.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-mono font-medium ${
                      client.balance_usd > 0 ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {formatCurrency(client.balance_usd)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      client.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Master Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Master Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Main Account"
                  required
                />
              </div>

              {/* Account Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewAccount({ ...newAccount, account_type: 'discounted' })}
                    className={`p-3 border rounded-lg text-left transition-all ${
                      newAccount.account_type === 'discounted'
                        ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">Discounted</span>
                      {newAccount.account_type === 'discounted' && <Check className="w-4 h-4 text-green-600" />}
                    </div>
                    <p className="text-xs text-gray-500">Buy: -70% → Sell: -20%</p>
                    <p className="text-xs text-green-600 font-medium mt-1">166% margin ✅</p>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setNewAccount({ ...newAccount, account_type: 'regular' })}
                    className={`p-3 border rounded-lg text-left transition-all ${
                      newAccount.account_type === 'regular'
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">Regular</span>
                      {newAccount.account_type === 'regular' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-gray-500">Buy: 0% → Sell: +5%</p>
                    <p className="text-xs text-blue-600 font-medium mt-1">5% margin (backup)</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OpenRouter API Key *</label>
                <input
                  type="password"
                  value={newAccount.api_key}
                  onChange={(e) => setNewAccount({ ...newAccount, api_key: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="sk-or-..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newAccount.discount_percent}
                  onChange={(e) => setNewAccount({ ...newAccount, discount_percent: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit (USD)</label>
                <input
                  type="number"
                  value={newAccount.monthly_limit_usd}
                  onChange={(e) => setNewAccount({ ...newAccount, monthly_limit_usd: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Optional"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
