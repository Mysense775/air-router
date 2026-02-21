import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Brain,
  DollarSign,
  ChevronDown,
  Sparkles,
  BarChart3,
  Book,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  HelpCircle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import ModelAdvisor from '../components/ModelAdvisor'

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
  created_at?: string
}

export default function Models() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Read filters from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedProvider, setSelectedProvider] = useState<string>(searchParams.get('provider') || 'all')
  const [priceFilter, setPriceFilter] = useState<string>(searchParams.get('price') || 'all')
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort') || 'date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchParams.get('order') as 'asc' | 'desc' || 'desc')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

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

  // Filter and sort models
  const filteredModels = useMemo(() => {
    let result = models.filter(model => {
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
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          comparison = dateA - dateB
          break
        case 'price':
          comparison = (a.pricing?.prompt || 0) - (b.pricing?.prompt || 0)
          break
        case 'context':
          comparison = getContextLength(a) - getContextLength(b)
          break
        case 'name':
        default:
          comparison = a.name.localeCompare(b.name)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return result
  }, [models, searchQuery, selectedProvider, priceFilter, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage)
  const paginatedModels = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredModels.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredModels, currentPage])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (selectedProvider !== 'all') params.set('provider', selectedProvider)
    if (priceFilter !== 'all') params.set('price', priceFilter)
    if (sortBy !== 'date') params.set('sort', sortBy)
    if (sortOrder !== 'asc') params.set('order', sortOrder)
    setSearchParams(params)
    setCurrentPage(1)
  }, [searchQuery, selectedProvider, priceFilter, sortBy, sortOrder])

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedProvider, priceFilter, sortBy, sortOrder])

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
      <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-red-700">
        Failed to load models
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Available Models</h1>
          <p className="text-gray-600 mt-1">
            {models.length} AI models available. Choose the best for your task.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Link 
              to="/docs" 
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full"
            >
              <Book className="w-4 h-4" />
              <span>How to connect to n8n, Make, Zapier</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link 
              to="/docs/models" 
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Which model to choose?</span>
            </Link>
          </div>
        </div>
        <ModelAdvisor />
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
              <p className="text-sm text-gray-600 mt-1">
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
      <div className="bg-white rounded-[20px] p-4 border border-gray-200 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Provider Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[160px]"
            >
              <option value="all">All Providers</option>
              {providers.filter(p => p !== 'all').map(provider => (
                <option key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          
          {/* Price Filter */}
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[160px]"
            >
              <option value="all">All Prices</option>
              <option value="cheap">Cheap (&lt; $1/M)</option>
              <option value="medium">Medium ($1-10/M)</option>
              <option value="expensive">Expensive (&gt; $10/M)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
          
          {/* Sort */}
          <div className="flex gap-2">
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[140px]"
              >
                <option value="date">Sort by Release Date</option>
                <option value="name">Sort by Name</option>
                <option value="price">Sort by Price</option>
                <option value="context">Sort by Context</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-gray-300 rounded-[20px] hover:bg-gray-50 transition-colors"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ArrowDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>
        
        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600 flex items-center justify-between">
          <span>
            Showing <strong>{paginatedModels.length}</strong> of <strong>{filteredModels.length}</strong> models 
            {filteredModels.length !== models.length && (
              <span className="text-blue-600"> (filtered from {models.length})</span>
            )}
          </span>
          {(searchQuery || selectedProvider !== 'all' || priceFilter !== 'all' || sortBy !== 'date' || sortOrder !== 'desc') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedProvider('all')
                setPriceFilter('all')
                setSortBy('date')
                setSortOrder('desc')
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedModels.map((model) => {
          const provider = model.id.split('/')[0]
          const contextLength = getContextLength(model)
          
          return (
            <div key={model.id} className="bg-white rounded-[20px] border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all flex flex-col h-full min-h-[200px]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase">{provider}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(model.id)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-[20px] transition-colors"
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
                <p className="text-sm text-gray-600 mt-1 line-clamp-2 flex-grow">
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
              
              <div className="mt-3 flex items-center justify-between">
                {model.pricing && model.pricing.prompt < 0.000001 ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    <span>Great value</span>
                  </div>
                ) : (
                  <div></div>
                )}
                <Link 
                  to={`/docs?model=${encodeURIComponent(model.id)}`}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  title="How to use this model"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>How to use</span>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredModels.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-[20px] border border-gray-200">
          <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No models found</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            We couldn't find any models matching your current filters. Try adjusting your search or filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedProvider('all')
              setPriceFilter('all')
              setSortBy('date')
              setSortOrder('desc')
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-[20px] hover:bg-blue-700 transition-colors font-medium"
          >
            <Filter className="w-4 h-4" />
            Clear all filters
          </button>
          <div className="mt-6 text-sm text-gray-500">
            <p>Total available models: <strong>{models.length}</strong></p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-[20px] border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            {/* Previous button */}
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-[20px] border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            {/* Next button */}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-[20px] border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {filteredModels.length} models total
          </div>
        </div>
      )}
    </div>
  )
}
