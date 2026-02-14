import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Search, Copy, Check, DollarSign, Zap, Brain, AlertCircle } from 'lucide-react'

interface Model {
  id: string
  name: string
  description?: string
  pricing?: {
    prompt: number
    completion: number
  }
  context_length?: number
}

export default function Models() {
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // Use React Query with retry logic
  const { data: models = [], isLoading, error, isError } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await api.get('/models')
      return res.data.data || res.data || []
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  const filteredModels = models.filter((m: Model) => {
    const searchLower = search.toLowerCase()
    return m.id.toLowerCase().includes(searchLower) || 
           m.name?.toLowerCase().includes(searchLower)
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A'
    return `$${(price * 1000).toFixed(4)}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Available Models</h1>
            <p className="text-gray-500 mt-1">Choose from AI models</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Failed to load models</h3>
          <p className="text-red-700 mb-4">{(error as any)?.message || 'Please try again later'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Models</h1>
          <p className="text-gray-500 mt-1">Choose from {models.length} AI models</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <DollarSign className="w-4 h-4" />
          Prices per 1K tokens
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid gap-4">
        {filteredModels.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No models found</p>
          </div>
        ) : (
          filteredModels.map((model: Model) => (
            <div key={model.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 truncate">{model.name || model.id}</h3>
                    {model.context_length && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {model.context_length.toLocaleString()} ctx
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 font-mono mt-1 truncate">{model.id}</p>
                  {model.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{model.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      <span className="text-gray-600">In:</span>
                      <span className="font-semibold text-gray-900">{formatPrice(model.pricing?.prompt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm mt-1">
                      <Zap className="w-3 h-3 text-green-500" />
                      <span className="text-gray-600">Out:</span>
                      <span className="font-semibold text-gray-900">{formatPrice(model.pricing?.completion)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(model.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Copy model ID"
                  >
                    {copied === model.id ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Usage Example</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST https://airouter.host/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "anthropic/claude-3.5-sonnet",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
        </pre>
      </div>
    </div>
  )
}
