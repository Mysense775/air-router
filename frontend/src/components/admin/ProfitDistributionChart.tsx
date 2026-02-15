import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
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

const COLORS = {
  discounted: '#10b981', // green-500
  regular: '#f59e0b',    // amber-500
  investor: '#3b82f6',   // blue-500
  unknown: '#6b7280'     // gray-500
}

export default function ProfitDistributionChart() {
  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ['admin-profit-distribution'],
    queryFn: async () => {
      const response = await adminApi.getDashboardStats(30)
      return response.data
    }
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-80">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-56 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const chartData = (data?.by_account_type || [])
    .filter(item => item.profit > 0)
    .map(item => ({
      name: item.account_type === 'discounted' ? 'Discounted' : 
            item.account_type === 'regular' ? 'Regular' : 
            item.account_type === 'investor' ? 'Investor' : item.account_type,
      value: item.profit,
      type: item.account_type
    }))

  const totalProfit = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">Распределение прибыли</h3>
      
      {chartData.length > 0 ? (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.type as keyof typeof COLORS] || COLORS.unknown} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Общая прибыль:</span>
              <span className="text-lg font-bold text-gray-900">${totalProfit.toFixed(2)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          Нет данных о прибыли
        </div>
      )}
    </div>
  )
}
