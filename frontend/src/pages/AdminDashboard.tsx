import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/client'
import { 
  Wallet, 
  Users, 
  CreditCard, 
  PiggyBank,
  TrendingUp
} from 'lucide-react'

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

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await adminApi.getDashboard()
      return res.data as DashboardData
    }
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-6 h-32 animate-pulse" />
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
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Platform overview and statistics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-500/20 text-blue-400',
            green: 'bg-green-500/20 text-green-400',
            purple: 'bg-purple-500/20 text-purple-400',
            orange: 'bg-orange-500/20 text-orange-400'
          }

          return (
            <div key={index} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {stat.suffix === 'USD' ? formatCurrency(stat.value) : stat.value}
              </div>
              <div className="text-sm text-gray-400 mt-1">{stat.title}</div>
            </div>
          )
        })}
      </div>

      {/* Master Accounts Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            Master Accounts
          </h2>
          <span className="text-sm text-gray-400">
            {data?.master_accounts.length || 0} accounts
          </span>
        </div>
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Monthly Usage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data?.master_accounts.map((account) => (
              <tr key={account.id} className="hover:bg-slate-700/30">
                <td className="px-6 py-4 text-white font-medium">{account.name}</td>
                <td className="px-6 py-4">
                  <span className={`font-mono font-medium ${
                    account.balance_usd < 5 ? 'text-red-400' : 
                    account.balance_usd < 20 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {formatCurrency(account.balance_usd)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300">{account.discount_percent}%</td>
                <td className="px-6 py-4">
                  {account.monthly_limit_usd ? (
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-600 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((account.monthly_used_usd / account.monthly_limit_usd) * 100, 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        ${account.monthly_used_usd.toFixed(0)} / ${account.monthly_limit_usd.toFixed(0)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">No limit</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deposit Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-300">Manual Deposits</h3>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(data?.manual_deposits || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Added by admin</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-300">Payment Deposits</h3>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(data?.payment_deposits || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Via payment system</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <PiggyBank className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-300">Total Deposits</h3>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(data?.total_deposits || 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
      </div>

      {/* Top Clients by Balance */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Top Clients by Balance
          </h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data?.clients
              .sort((a, b) => b.balance_usd - a.balance_usd)
              .slice(0, 10)
              .map((client) => (
                <tr key={client.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-white">{client.email}</td>
                  <td className="px-6 py-4 text-gray-300">{client.name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-mono font-medium ${
                      client.balance_usd > 0 ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {formatCurrency(client.balance_usd)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      client.status === 'active' 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
