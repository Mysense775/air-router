import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { adminApi } from '../../api/client'

interface SystemLoadData {
  date: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export default function SystemLoadChart() {
  const { data, isLoading } = useQuery<{ load_data: SystemLoadData[] }>({
    queryKey: ['admin-system-load'],
    queryFn: async () => {
      // Using existing endpoint with request logs aggregation
      const response = await adminApi.getLogs(1000)
      
      // Aggregate by date - API returns { logs: [...] }
      const logs = response.data?.logs || []
      const byDate = logs.reduce((acc: Record<string, { prompt: number; completion: number }>, log: any) => {
        const date = new Date(log.created_at).toLocaleDateString('ru-RU', { 
          day: '2-digit', 
          month: '2-digit' 
        })
        if (!acc[date]) {
          acc[date] = { prompt: 0, completion: 0 }
        }
        acc[date].prompt += log.prompt_tokens || 0
        acc[date].completion += log.completion_tokens || 0
        return acc
      }, {})
      
      const chartData = Object.entries(byDate as Record<string, { prompt: number; completion: number }>)
        .map(([date, tokens]) => ({
          date,
          prompt_tokens: tokens.prompt,
          completion_tokens: tokens.completion,
          total_tokens: tokens.prompt + tokens.completion
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14) // Last 14 days
      
      return { load_data: chartData }
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

  const chartData = data?.load_data || []

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4">Нагрузка на систему (токены)</h3>
      
      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
              />
              <Tooltip 
                formatter={(value: number) => [value.toLocaleString(), '']}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="prompt_tokens" 
                name="Prompt tokens" 
                stackId="1" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="completion_tokens" 
                name="Completion tokens" 
                stackId="1" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-600">
          Нет данных о нагрузке
        </div>
      )}
    </div>
  )
}
