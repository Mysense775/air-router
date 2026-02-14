import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ArrowUpRight,
  DollarSign,
  PiggyBank,
  Zap,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { api } from '../api/client'

interface Request {
  id: string
  model: string
  endpoint: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  openrouter_cost_usd: number
  our_cost_usd: number
  client_cost_usd: number
  savings_usd: number
  account_type: string
  status: string
  duration_ms: number
  created_at: string
}

export default function RequestHistory() {
  const [page, setPage] = useState(1)
  const perPage = 20

  const { data, isLoading, error } = useQuery({
    queryKey: ['requestHistory', page],
    queryFn: async () => {
      const res = await api.get(`/client/request-history?page=${page}&limit=${perPage}`)
      return res.data
    },
  })

  const requests: Request[] = data?.requests || []
  const totalPages = data?.total_pages || 1
  const totalRequests = data?.total || 0

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Calculate totals for current page
  const totalSavings = requests.reduce((sum, req) => sum + (req.savings_usd || 0), 0)
  const totalSpent = requests.reduce((sum, req) => sum + req.client_cost_usd, 0)
  const totalTokens = requests.reduce((sum, req) => sum + req.total_tokens, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load request history
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request History</h1>
        <p className="text-gray-500 mt-1">
          Detailed log of all API requests with price breakdown
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Total Requests</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{totalRequests}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">Total Spent</span>
          </div>
          <p className="text-2xl font-bold text-green-900">${totalSpent.toFixed(6)}</p>
        </div>

        <div className="bg-pink-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-pink-600 mb-1">
            <PiggyBank className="w-4 h-4" />
            <span className="text-sm font-medium">Total Saved</span>
          </div>
          <p className="text-2xl font-bold text-pink-900">${totalSavings.toFixed(6)}</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <ArrowUpRight className="w-4 h-4" />
            <span className="text-sm font-medium">Total Tokens</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{totalTokens.toLocaleString()}</p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  <span className="text-gray-400">OpenRouter</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  <span className="text-blue-600">Your Price</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  <span className="text-green-600">Saved</span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {getStatusIcon(req.status)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(req.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{req.model}</span>
                      {req.account_type && (
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          req.account_type === 'discounted' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {req.account_type}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">
                    {req.total_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-gray-400">
                    ${req.openrouter_cost_usd.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-blue-600 font-medium">
                    ${req.client_cost_usd.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono text-green-600">
                    ${req.savings_usd.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-500">
                    {formatDuration(req.duration_ms)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {requests.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No requests yet</p>
            <p className="text-sm">Make your first API call to see history</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Price Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <span className="font-medium">OpenRouter Price:</span> What you'd pay directly to OpenRouter
          </div>
          <div>
            <span className="font-medium text-blue-600">Your Price:</span> What you actually paid through AI Router
          </div>
          <div>
            <span className="font-medium text-green-600">Saved:</span> Your discount (usually 20%)
          </div>
        </div>
      </div>
    </div>
  )
}
