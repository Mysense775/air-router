import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  TrendingUp,
  Activity,
  Key,
  ArrowUpRight,
  PiggyBank,
} from 'lucide-react'
import { clientApi, apiKeysApi } from '../api/client'
import { Balance, UsageStats, ApiKey } from '../types'
import { useTranslation } from '../i18n'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { HoverStatCard } from '../components/HoverCard'

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  
  // Fetch balance
  const { data: balanceData, isLoading: isLoadingBalance } = useQuery({
    queryKey: ['balance'],
    queryFn: () => clientApi.getBalance(),
  })

  // Fetch usage stats
  const { data: usageData, isLoading: isLoadingUsage } = useQuery({
    queryKey: ['usage', 7],
    queryFn: () => clientApi.getUsage(7),
  })

  // Fetch API keys
  const { data: apiKeysData, isLoading: isLoadingKeys } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => apiKeysApi.getApiKeys(),
  })

  // Fetch daily usage for line chart
  const { data: dailyUsageData, isLoading: isLoadingDaily } = useQuery({
    queryKey: ['dailyUsage', 30],
    queryFn: () => clientApi.getDailyUsageForCharts(30),
  })

  // Fetch models usage for bar chart
  const { data: modelsUsageData, isLoading: isLoadingModels } = useQuery({
    queryKey: ['modelsUsage', 30],
    queryFn: () => clientApi.getModelsUsage(30),
  })

  const isLoading = isLoadingBalance || isLoadingUsage || isLoadingKeys || isLoadingDaily || isLoadingModels

  const balance: Balance = balanceData?.data || {
    balance_usd: 0,
    lifetime_spent: 0,
    lifetime_earned: 0,
    lifetime_savings: 0,
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

  // Prepare chart data
  const dailyData = dailyUsageData?.data?.daily || []
  const modelsData = modelsUsageData?.data?.models?.slice(0, 5) || []

  const stats = [
    {
      title: t('dashboard.currentBalance'),
      value: balance.balance_usd,
      prefix: '$',
      decimals: 5,
      icon: Wallet,
      color: 'blue',
      trend: t('dashboard.availableForApiCalls'),
    },
    {
      title: t('dashboard.totalSpent'),
      value: balance.lifetime_spent,
      prefix: '$',
      decimals: 5,
      icon: TrendingUp,
      color: 'green',
      trend: t('dashboard.lifetimeSpending'),
    },
    {
      title: t('dashboard.yourSavings'),
      value: balance.lifetime_savings,
      prefix: '$',
      decimals: 5,
      icon: PiggyBank,
      color: 'pink',
      trend: t('dashboard.vsOpenRouterDirect'),
    },
    {
      title: t('dashboard.activeApiKeys'),
      value: activeKeys,
      decimals: 0,
      icon: Key,
      color: 'orange',
      trend: `${apiKeys.length} ${t('common.total') || 'total'}`,
    },
  ]

  // Skeleton component for stats
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded w-32 mb-1 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
            </div>
            <div className="p-2 rounded-[20px] bg-gray-100">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  // Skeleton for charts
  const ChartSkeleton = () => (
    <div className="h-64 bg-gray-50 rounded-[20px] animate-pulse" />
  )

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
            purple: 'bg-purple-50 text-purple-600',
            orange: 'bg-orange-50 text-orange-600',
            pink: 'bg-pink-50 text-pink-600',
          }

          return (
            <HoverStatCard
              key={stat.title}
              color={stat.color as 'blue' | 'green' | 'pink' | 'orange' | 'purple'}
              className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    <AnimatedNumber
                      value={stat.value}
                      prefix={stat.prefix || ''}
                      decimals={stat.decimals}
                      duration={1.5}
                    />
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">{stat.trend}</p>
                </div>
                <div className={`p-2 rounded-[20px] ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
            </HoverStatCard>
          )
        })}
      </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => navigate('/deposit')}
              aria-label={t('dashboard.topUpBalance')}
              className="flex items-center gap-3 p-4 rounded-[20px] border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="p-2 bg-blue-100 rounded-[20px]">
                <Wallet className="w-4 h-4 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{t('dashboard.topUpBalance')}</p>
              </div>
            </button>
            <button 
              onClick={() => navigate('/api-keys')}
              aria-label={t('dashboard.createKey')}
              className="flex items-center gap-3 p-4 rounded-[20px] border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <div className="p-2 bg-purple-100 rounded-[20px]">
                <Key className="w-4 h-4 text-purple-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{t('dashboard.createKey')}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentActivity')}</h3>
          {usage.by_model.length > 0 ? (
            <div className="space-y-3">
              {usage.by_model.slice(0, 2).map((model) => (
                <div
                  key={model.model}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-100 rounded-[20px] flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-gray-600" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{model.model}</p>
                      <p className="text-xs text-gray-600">{model.requests} {t('dashboard.requests')}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    ${model.cost_usd.toFixed(5)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
              <p>{t('dashboard.noRecentActivity')}</p>
              <p className="text-sm text-gray-600">{t('dashboard.makeYourFirstApiCall')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Price Comparison */}
      {usage.total_cost_usd > 0 && (
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.priceComparison')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-[20px] p-4">
              <p className="text-sm text-gray-600 mb-1">{t('dashboard.openRouterPrice')}</p>
              <p className="text-xl font-mono font-bold text-gray-900">
                ${(usage.total_cost_usd / 0.8).toFixed(5)}
              </p>
              <p className="text-xs text-gray-600">{t('dashboard.ifUsingDirectly')}</p>
            </div>
            <div className="bg-blue-50 rounded-[20px] p-4">
              <p className="text-sm text-blue-700 mb-1">{t('dashboard.yourPrice')}</p>
              <p className="text-xl font-mono font-bold text-blue-900">
                ${usage.total_cost_usd.toFixed(5)}
              </p>
              <p className="text-xs text-blue-600">{t('dashboard.withAiRouter')}</p>
            </div>
            <div className="bg-green-50 rounded-[20px] p-4">
              <p className="text-sm text-green-700 mb-1">{t('dashboard.youSaved')}</p>
              <p className="text-xl font-mono font-bold text-green-900">
                ${(usage.total_cost_usd / 0.8 - usage.total_cost_usd).toFixed(5)}
              </p>
              <p className="text-xs text-green-600">20% {t('dashboard.averageDiscount')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Line Chart */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.dailySpending')}</h3>
          {isLoadingDaily ? (
            <ChartSkeleton />
          ) : dailyData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toFixed(4)}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(6)}`, t('dashboard.yourPrice')]}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('ru-RU')}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost_usd" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 bg-gray-50 rounded-[20px] flex items-center justify-center">
              <p className="text-gray-600">{t('common.noData')}</p>
            </div>
          )}
        </div>

        {/* Models Bar Chart */}
        <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.topModelsByCost')}</h3>
          {isLoadingModels ? (
            <ChartSkeleton />
          ) : modelsData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toFixed(4)}`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="model" 
                    stroke="#4b5563"
                    fontSize={11}
                    width={120}
                    tickFormatter={(model) => model.split('/').pop() || model}
                  />
                  <Tooltip 
                    formatter={(value: number, _name: string, props: any) => {
                      const model = props.payload?.model || ''
                      return [`$${value.toFixed(6)}`, model]
                    }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar 
                    dataKey="cost_usd" 
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 bg-gray-50 rounded-[20px] flex items-center justify-center">
              <p className="text-gray-600">{t('common.noData')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
