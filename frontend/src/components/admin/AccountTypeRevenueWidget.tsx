import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/client'

interface RevenueByType {
  account_type: string
  revenue: number
  cost: number
  profit: number
  margin_percent: number
  requests_count: number
}

interface StatsData {
  by_account_type: RevenueByType[]
}

export default function AccountTypeRevenueWidget() {
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ['admin-revenue-by-type'],
    queryFn: async () => {
      const response = await adminApi.getDashboardStats(30)
      return response.data
    }
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  const types = data?.by_account_type || []
  
  const getTypeData = (type: string) => {
    return types.find(t => t.account_type === type) || {
      account_type: type,
      revenue: 0,
      cost: 0,
      profit: 0,
      margin_percent: 0,
      requests_count: 0
    }
  }

  const cards = [
    {
      type: 'discounted',
      title: 'Discounted',
      subtitle: 'Наши ключи (70% скидка)',
      color: 'green',
      data: getTypeData('discounted')
    },
    {
      type: 'regular',
      title: 'Regular',
      subtitle: 'Наши ключи (без скидки)',
      color: 'yellow',
      data: getTypeData('regular')
    },
    {
      type: 'investor',
      title: 'Investor',
      subtitle: 'Ключи инвесторов',
      color: 'blue',
      data: getTypeData('investor')
    }
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.type} className={`bg-white rounded-xl p-6 shadow-sm border-2 border-${card.color}-100`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900">{card.title}</h4>
              <p className="text-xs text-gray-500">{card.subtitle}</p>
            </div>
            <div className={`w-3 h-3 rounded-full bg-${card.color}-500`}></div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-lg font-bold text-gray-900">${card.data.revenue.toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-500">Cost</p>
                <p className="text-sm text-gray-700">${card.data.cost.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Profit</p>
                <p className={`text-sm font-semibold text-${card.color}-600`}>
                  ${card.data.profit.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Margin</span>
                <span className={`text-sm font-bold text-${card.color}-600`}>
                  {card.data.margin_percent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500">Requests</span>
                <span className="text-sm text-gray-700">{card.data.requests_count}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
