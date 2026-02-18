import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { useTranslation } from '../i18n'
import { api } from '../api/client'

interface StatsData {
  total_requests: number
  total_tokens: number
  total_earnings: number
  daily_stats: Array<{
    date: string
    requests: number
    tokens: number
    earnings: number
  }>
}

export default function InvestorStats() {
  useTranslation()

  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ['investor-stats'],
    queryFn: async () => {
      const response = await api.get('/investor/stats')
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
      title: 'Всего запросов',
      value: data?.total_requests || 0,
      icon: BarChart3,
      color: 'blue'
    },
    {
      title: 'Всего токенов',
      value: (data?.total_tokens || 0).toLocaleString(),
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Заработок',
      value: `$${(data?.total_earnings || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'purple'
    }
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-green-600" />
          Статистика
        </h1>
        <p className="text-gray-500 mt-1">
          Детальная статистика использования ваших ключей
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

      {/* Daily Stats Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Статистика по дням
          </h2>
        </div>
        
        {data?.daily_stats && data.daily_stats.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data.daily_stats.map((day, index) => (
              <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">
                      {new Date(day.date).getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString('ru-RU', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-500">{day.requests} запросов</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{day.tokens.toLocaleString()} токенов</p>
                  <p className="text-sm text-green-600">+${day.earnings.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Нет данных за выбранный период</p>
          </div>
        )}
      </div>
    </div>
  )
}
