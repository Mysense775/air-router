import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { adminApi } from '../api/client'

interface RevenueStats {
  total_revenue: {
    today: number
    this_month: number
    total: number
  }
}

export default function RevenueOverviewWidget() {
  const { data, isLoading } = useQuery<RevenueStats>({
    queryKey: ['admin-revenue-stats'],
    queryFn: async () => {
      const response = await adminApi.getDashboardStats(30)
      return response.data
    }
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Сегодня',
      value: data?.total_revenue?.today || 0,
      icon: Calendar,
      color: 'blue'
    },
    {
      title: 'Этот месяц',
      value: data?.total_revenue?.this_month || 0,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'Всего',
      value: data?.total_revenue?.total || 0,
      icon: DollarSign,
      color: 'purple'
    }
  ]

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-6">
        <DollarSign className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Доходы платформы</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="text-center">
              <div className={`inline-flex p-3 rounded-lg bg-${stat.color}-100 mb-2`}>
                <Icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <p className="text-sm text-gray-500">{stat.title}</p>
              <p className="text-xl font-bold text-gray-900">
                ${stat.value.toFixed(2)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
