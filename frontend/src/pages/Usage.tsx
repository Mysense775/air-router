import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, TrendingUp, Clock } from 'lucide-react'
import { clientApi } from '../api/client'

export default function UsagePage() {
  const [days, setDays] = useState(30)

  const { data: usageData } = useQuery({
    queryKey: ['usage', days],
    queryFn: () => clientApi.getUsage(days),
  })

  const { data: dailyData } = useQuery({
    queryKey: ['dailyUsage', days],
    queryFn: () => clientApi.getDailyUsage(days),
  })

  const { data: modelsData } = useQuery({
    queryKey: ['modelsUsage', days],
    queryFn: () => clientApi.getModelsUsage(days),
  })

  const usage = usageData?.data
  const daily = dailyData?.data?.daily || []
  const models = modelsData?.data?.models || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage Statistics</h1>
          <p className="text-gray-500">Monitor your API usage and costs</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Requests</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {usage?.total_requests?.toLocaleString() || 0}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <h3 className="text-2xl font-bold text-gray-900">
                ${usage?.total_cost_usd?.toFixed(2) || '0.00'}
              </h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Period</p>
              <h3 className="text-2xl font-bold text-gray-900">{days} days</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Models Usage */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Usage by Model</h3>
        </div>
        {models.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {models.map((model: any) => (
              <div key={model.model} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{model.model}</p>
                  <p className="text-sm text-gray-500">
                    {model.requests.toLocaleString()} requests • {model.total_tokens.toLocaleString()} tokens
                  </p>
                </div>
                <span className="font-semibold text-gray-900">
                  ${model.cost_usd.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No usage data for this period</p>
          </div>
        )}
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Daily Breakdown</h3>
        </div>
        {daily.length > 0 ? (
          <div className="divide-y divide-gray-100 max-h-96 overflow-auto">
            {daily.map((day: any) => (
              <div key={day.date} className="px-6 py-3 flex items-center justify-between">
                <span className="text-gray-600">{day.date}</span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">{day.requests} requests</span>
                  <span className="text-gray-500">{day.tokens.toLocaleString()} tokens</span>
                  <span className="font-medium text-gray-900 w-20 text-right">
                    ${day.cost_usd.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No daily data available</p>
          </div>
        )}
      </div>
    </div>
  )
}
