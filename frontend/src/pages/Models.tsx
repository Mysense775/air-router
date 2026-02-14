import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Brain,
  DollarSign,
  ChevronDown,
  Sparkles,
  BarChart3
} from 'lucide-react'
import { api } from '../api/client'

interface Model {
  id: string
  name: string
  description?: string
  pricing?: {
    prompt: number
    completion: number
  }
  context_length?: number
  top_provider?: {
    context_length?: number
  }
}

export default function Models() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string>('all')
  const [priceFilter, setPriceFilter] = useState<string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await api.get('/models')
      return res.data.data as Model[]
    },
  })

  const models = data || []

  // Get unique providers
  const providers = useMemo(() => {
    const providerSet = new Set<string>()
    models.forEach(model => {
      const provider = model.id.split('/')[0]
      providerSet.add(provider)
    })
    return ['all', ...Array.from(providerSet).sort()]
  }, [models])

  // Filter models
  const filteredModels = useMemo(() => {
    return models.filter(model => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = 
        model.name.toLowerCase().includes(searchLower) ||
        model.id.toLowerCase().includes(searchLower) ||
        (model.description && model.description.toLowerCase().includes(searchLower))
      
      // Provider filter
      const provider = model.id.split('/')[0]
      const matchesProvider = selectedProvider === 'all' || provider === selectedProvider
      
      // Price filter
      const promptPrice = model.pricing?.prompt || 0
      let matchesPrice = true
      if (priceFilter === 'cheap') matchesPrice = promptPrice < 0.000001
      else if (priceFilter === 'medium') matchesPrice = promptPrice >= 0.000001 && promptPrice < 0.00001
      else if (priceFilter === 'expensive') matchesPrice = promptPrice >= 0.00001
      
      return matchesSearch && matchesProvider && matchesPrice
    })
  }, [models, searchQuery, selectedProvider, priceFilter])

  // Get top recommended models
  const recommendedModels = useMemo(() => {
    const recommendations = []
    
    // Best value (cheap + good)
    const bestValue = models.find(m => m.id === 'openai/gpt-4o-mini')
    if (bestValue) recommendations.push({ model: bestValue, badge: '💰 Best Value', color: 'green' })
    
    // Best quality
    const bestQuality = models.find(m => m.id === 'openai/gpt-4o') || models.find(m => m.id.includes('claude-3-5'))
    if (bestQuality) recommendations.push({ model: bestQuality, badge: '🏆 Best Quality', color: 'purple' })
    
    // Long context
    const longContext = models.find(m => m.id.includes('claude-3-5') && m.context_length && m.context_length > 100000)
    if (longContext) recommendations.push({ model: longContext, badge: '📚 Long Context', color: 'blue' })
    
    return recommendations
  }, [models])

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatPrice = (price: number) => {
    if (!price) return 'Free'
    return `$${(price * 1000000).toFixed(2)}/M tokens`
  }

  const getContextLength = (model: Model) => {
    return model.context_length || model.top_provider?.context_length || 4096
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load models
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Available Models</h1>
        <p className="text-gray-500 mt-1">
          {models.length} AI models available. Choose the best for your task.
        </p>
      </div>

      {/* Recommendations */}
      {recommendedModels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendedModels.map(({ model, badge, color }) => (
            <div key={model.id} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4 relative`}>
              <span className={`absolute top-2 right-2 text-xs font-medium bg-${color}-100 text-${color}-700 px-2 py-1 rounded-full`}>
                {badge}
              </span>
              <h3 className="font-semibold text-gray-900 mt-4">{model.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatPrice(model.pricing?.prompt || 0)}
              </p>
              <button
                onClick={() => copyToClipboard(model.id)}
                className={`mt-3 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  copiedId === model.id
                    ? 'bg-green-600 text-white'
                    : `bg-${color}-600 text-white hover:bg-${color}-700`
                }`}
              >
                {copiedId === model.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Copied!
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Copy className="w-4 h-4" /> Copy ID
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Provider Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Providers</option>
              {providers.filter(p => p !== 'all').map(provider => (
                <option key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Price Filter */}
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Prices</option>
              <option value="cheap">Cheap (&lt; $1/M)</option>
              <option value="medium">Medium ($1-10/M)</option>
              <option value="expensive">Expensive (&gt; $10/M)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        {/* Results count */}
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredModels.length} of {models.length} models
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => {
          const provider = model.id.split('/')[0]
          const contextLength = getContextLength(model)
          
          return (
            <div key={model.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium text-gray-500 uppercase">{provider}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(model.id)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Copy model ID"
                >
                  {copiedId === model.id ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              <h3 className="font-semibold text-gray-900 mt-2">{model.name}</h3>
              
              {model.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {model.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatPrice(model.pricing?.prompt || 0)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <BarChart3 className="w-4 h-4" />
                  <span>{(contextLength / 1000).toFixed(0)}K context</span>
                </div>
              </div>
              
              {model.pricing && model.pricing.prompt < 0.000001 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                  <Sparkles className="w-3 h-3" />
                  <span>Great value</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredModels.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No models found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      )}
    </div>
  )
}
