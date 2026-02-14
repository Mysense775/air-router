import { useQuery } from '@tanstack/react-query'
import {
  Wallet,
  TrendingUp,
  Activity,
  Key,
  ArrowUpRight,
} from 'lucide-react'
import { clientApi, apiKeysApi } from '../api/client'
import { Balance, UsageStats, ApiKey } from '../types'

export default function Dashboard() {
  // Fetch balance
  const { data: balanceData } = useQuery({
    queryKey: ['balance'],
    queryFn: () => clientApi.getBalance(),
  })

  // Fetch usage stats
  const { data: usageData } = useQuery({
    queryKey: ['usage', 7],
    queryFn: () => clientApi.getUsage(7),
  })

  // Fetch API keys
  const { data: apiKeysData } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => apiKeysApi.getApiKeys(),
  })

  const balance: Balance = balanceData?.data || {
    balance_usd: 0,
    lifetime_spent: 0,
    lifetime_earned: 0,
    currency: 'USD',
    last_deposit_at: null,
  }

  const usage: UsageStats = usageData?.data || {
    period: '7d',
    total_requests: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    total_profit_usd: 0,
    by_model: [],
  }

  const apiKeys: ApiKey[] = apiKeysData?.data || []
  const activeKeys = apiKeys.filter((k) => k.is_active).length

  const stats = [
    {
      title: 'Current Balance',
      value: `$${balance.balance_usd.toFixed(2)}`,
      icon: Wallet,
      color: 'blue',
      trend: '+100.00',
    },
    {
      title: 'Total Spent',
      value: `$${balance.lifetime_spent.toFixed(2)}`,
      icon: TrendingUp,
      color: 'green',
      trend: 'Lifetime',
    },
    {
      title: 'API Requests (7d)',
      value: usage.total_requests.toLocaleString(),
      icon: Activity,
      color: 'purple',
      trend: `${usage.total_tokens.toLocaleString()} tokens`,
    },
    {
      title: 'Active API Keys',
      value: activeKeys.toString(),
      icon: Key,
      color: 'orange',
      trend: `${apiKeys.length} total`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            orange: 'bg-orange-50 text-orange-600',
          }

          return (
            <div
              key={stat.title}
              className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                  <p className="text-xs text-gray-400 mt-1">{stat.trend}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Add Funds</p>
                <p className="text-xs text-gray-500">Top up balance</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors text-left">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Key className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">New API Key</p>
                <p className="text-xs text-gray-500">Create key</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {usage.by_model.length > 0 ? (
            <div className="space-y-3">
              {usage.by_model.slice(0, 5).map((model) => (
                <div
                  key={model.model}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{model.model}</p>
                      <p className="text-xs text-gray-500">{model.requests} requests</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    ${model.cost_usd.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Make your first API call to see stats</p>
            </div>
          )}
        </div>
      </div>

      {/* API Usage Chart Placeholder */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Usage Overview</h3>
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-400">Usage charts coming soon...</p>
        </div>
      </div>
    </div>
  )
}
