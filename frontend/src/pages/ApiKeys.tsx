import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Copy, Plus, Trash2, Brain, AlertCircle } from 'lucide-react'
import { apiKeysApi, api } from '../api/client'
import { ApiKey } from '../types'

interface Model {
  id: string
  name: string
}

export default function ApiKeysPage() {
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [newKeyModel, setNewKeyModel] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Load models for selection with retry logic
  const { data: modelsData, error: modelsError, isError: isModelsError } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await api.get('/models')
      return res.data.data || []
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })

  const models: Model[] = modelsData || []

  // Load API keys with retry logic
  const { data, isLoading, error: apiKeysError, isError: isApiKeysError } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => apiKeysApi.getApiKeys(),
    retry: 3,
    retryDelay: 1000,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })

  const [createError, setCreateError] = useState<string>('')

  const createMutation = useMutation({
    mutationFn: async () => {
      // Retry logic for creation
      let lastError
      for (let i = 0; i < 3; i++) {
        try {
          const response = await apiKeysApi.createApiKey(newKeyName || 'New Key', selectedModel || undefined)
          return response
        } catch (error: any) {
          lastError = error
          if (error.response?.status >= 500 || !error.response) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 500))
            continue
          }
          throw error // Don't retry on 4xx errors
        }
      }
      throw lastError
    },
    onSuccess: (response) => {
      setShowNewKey(response.data.key)
      setNewKeyModel(response.data.allowed_model)
      setNewKeyName('')
      setSelectedModel('')
      setCreateError('')
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
    },
    onError: (error: any) => {
      setCreateError(error.response?.data?.detail || 'Failed to create API key. Please try again.')
    },
    retry: 0, // We handle retry manually
  })

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => apiKeysApi.revokeApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
    },
  })

  const apiKeys: ApiKey[] = data?.data || []

  // Show error if any
  const hasError = isModelsError || isApiKeysError
  const errorMessage = modelsError?.message || apiKeysError?.message || ''

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600">Manage your API keys for accessing the platform</p>
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 flex items-start gap-3" role="alert" aria-live="polite">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-red-800">
            <p className="font-medium mb-1">Failed to load data</p>
            <p>{errorMessage || 'Please refresh the page to try again'}</p>
          </div>
        </div>
      )}

      {/* New Key Modal/Form */}
      {showNewKey && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-[20px] p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold mb-2">New API Key Created!</h3>
              <p className="text-sm opacity-90 mb-4">
                Copy this key now. You won't be able to see it again.
              </p>
              <div className="flex items-center gap-2 bg-white/10 rounded-[20px] p-3 mb-3">
                <code className="font-mono text-sm break-all flex-1">{showNewKey}</code>
                <button
                  onClick={() => copyToClipboard(showNewKey)}
                  aria-label="Copy API key to clipboard"
                  className="p-2 hover:bg-white/10 rounded-[20px] transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <Copy className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {newKeyModel && (
                <div className="flex items-center gap-2 text-sm bg-white/10 rounded-[20px] p-2">
                  <Brain className="w-4 h-4" aria-hidden="true" />
                  <span>Restricted to model: <strong>{newKeyModel}</strong></span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowNewKey(null)}
              aria-label="Close new key notification"
              className="text-white/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Create New Key */}
      <div className="bg-white rounded-[20px] p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New API Key</h3>
        <div className="space-y-4">
          {createError && (
            <div className="bg-red-50 border border-red-200 rounded-[20px] p-3 text-sm text-red-700" role="alert" aria-live="polite">
              {createError}
            </div>
          )}
          <div className="flex gap-4">
            <input
              id="key-name"
              type="text"
              value={newKeyName}
              onChange={(e) => {
                setNewKeyName(e.target.value)
                setCreateError('')
              }}
              placeholder="Key name (e.g., Production, Development)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-describedby="key-name-hint"
            />
          </div>
          
          {/* Model Selection */}
          <div>
            <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
              Restrict to Specific Model (Optional)
            </label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-describedby="model-hint"
            >
              <option value="">Any model (no restriction)</option>
              {models.map((model: Model) => (
                <option key={model.id} value={model.id}>
                  {model.name || model.id}
                </option>
              ))}
            </select>
            <p id="model-hint" className="text-sm text-gray-600 mt-1">
              If selected, this key will only work with the chosen model
            </p>
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            aria-busy={createMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-[20px] hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {createMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Create Key</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Your API Keys</h3>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
            <p>No API keys yet</p>
            <p className="text-sm text-gray-600">Create your first key to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {apiKeys.map((key) => (
              <div key={key.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${key.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Key className={`w-4 h-4 ${key.is_active ? 'text-green-600' : 'text-gray-600'}`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                      {key.allowed_model && (
                        <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          <Brain className="w-3 h-3" aria-hidden="true" />
                          {key.allowed_model}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    key.is_active 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {key.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {key.is_active && (
                    <button
                      onClick={() => revokeMutation.mutate(key.id)}
                      disabled={revokeMutation.isPending}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-[20px] transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label={`Revoke key ${key.name}`}
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Model Restriction</p>
          <p>
            You can create API keys restricted to specific models. 
            If a key is restricted, it will only work with that model and return an error for others. 
            Keys without restriction work with any model.
          </p>
        </div>
      </div>
    </div>
  )
}
