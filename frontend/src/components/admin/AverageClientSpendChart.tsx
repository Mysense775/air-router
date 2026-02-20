import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { adminApi } from '../../api/client'

interface ClientSpendData {
  date: string
  avg_spend: number
  total_spend: number
  client_count: number
}

export default function AverageClientSpendChart() {
  const { data, isLoading } = useQuery<{ spend_data: ClientSpendData[] }>({
    queryKey: ['admin-client-spend'],
    queryFn: async () => {
      const response = await adminApi.getLogs(1000)
      
      // API returns { logs: [...] }
      const logs = response.data?.logs || []
      
      // Group by date and calculate avg spend
      const byDate = logs.reduce((acc: Record<string, { total: number; clients: Set<string> }>, log: any) => {
        const date = new Date(log.created_at).toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit' 
        })
        if (!acc[date]) {
          acc[date] = { total: 0, clients: new Set() }
        }
        acc[date].total += parseFloat(log.cost_to_client_usd) || 0
        acc[date].clients.add(log.user_id)
        return acc
      }, {})
      
      const chartData = Object.entries(byDate as Record<string, { total: number; clients: Set<string> }>)
        .map(([date, data]) => ({
          date,
          avg_spend: data.clients.size > 0 ? data.total / data.clients.size : 0,
          total_spend: data.total,
          client_count: data.clients.size
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14)
      
      return { spend_data: chartData }
    }
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100 h-80">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-56 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const chartData = data?.spend_data || []

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">Средний чек клиента ($)</h3>
      
      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'avg_spend') return [`$${value.toFixed(2)}`, 'Средний чек']
                  if (name === 'total_spend') return [`$${value.toFixed(2)}`, 'Всего']
                  return [value, name]
                }}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="avg_spend" 
                name="Средний чек" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="total_spend" 
                name="Общие расходы" 
                stroke="#06b6d4" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-600">
          Нет данных о расходах клиентов
        </div>
      )}
      
      {chartData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
          <span className="text-gray-600">
            Среднее за период: 
            <span className="font-semibold text-gray-900 ml-1">
              ${(chartData.reduce((sum, d) => sum + d.avg_spend, 0) / chartData.length).toFixed(2)}
            </span>
          </span>
          <span className="text-gray-600">
            Всего клиентов (сегодня): 
            <span className="font-semibold text-gray-900 ml-1">
              {chartData[chartData.length - 1]?.client_count || 0}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
