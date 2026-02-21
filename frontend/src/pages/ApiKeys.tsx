import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Copy, Plus, Trash2, Brain, AlertCircle, MessageCircle } from 'lucide-react'
import { apiKeysApi, api } from '../api/client'
import { ApiKey } from '../types'
import { AnimatedModal, AnimatedCheckmark } from '../components/AnimatedModal'
import { gsap } from 'gsap'

interface Model {
  id: string
  name: string
}

export default function ApiKeysPage() {
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isSupportOnly, setIsSupportOnly] = useState(false)
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [newKeyModel, setNewKeyModel] = useState<string | null>(null)
  const [newKeySupportOnly, setNewKeySupportOnly] = useState(false)
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)

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
          const response = await apiKeysApi.createApiKey(newKeyName || 'New Key', selectedModel || undefined, isSupportOnly)
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
      setNewKeySupportOnly(response.data.is_support_only)
      setNewKeyName('')
      setSelectedModel('')
      setIsSupportOnly(false)
      setCreateError('')
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
    },
    onError: (error: any) => {
      setCreateError(error.response?.data?.detail || 'Failed to create API key. Please try again.')
      // Shake animation on error
      if (inputRef.current) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!prefersReducedMotion) {
          gsap.to(inputRef.current, {
            x: "+=10",
            duration: 0.1,
            repeat: 5,
            yoyo: true,
            ease: 'power2.inOut',
          })
        }
      }
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
      <AnimatedModal
        isOpen={!!showNewKey}
        onClose={() => setShowNewKey(null)}
        className="bg-white rounded-[20px] p-5 max-w-md w-[90%] mx-auto shadow-2xl"
      >
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <AnimatedCheckmark size={64} animate={!!showNewKey} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">API Key Created!</h3>
          <p className="text-xs text-gray-600 mb-3">
            Copy this key now. You won't be able to see it again.
          </p>
          <div className="flex items-center gap-2 bg-gray-100 rounded-[20px] p-2 mb-2">
            <code className="font-mono text-xs break-all flex-1 text-left">{showNewKey}</code>
            <button
              onClick={() => copyToClipboard(showNewKey!)}
              aria-label="Copy API key to clipboard"
              className="p-2 hover:bg-gray-200 rounded-[20px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Copy className="w-4 h-4 text-gray-600" aria-hidden="true" />
            </button>
          </div>
          {newKeyModel && (
            <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 rounded-[20px] p-2 mb-2">
              <Brain className="w-3 h-3" aria-hidden="true" />
              <span>Restricted to: <strong>{newKeyModel}</strong></span>
            </div>
          )}
          {newKeySupportOnly && (
            <div className="flex items-center gap-2 text-xs bg-purple-50 text-purple-700 rounded-[20px] p-2 mb-3">
              <MessageCircle className="w-3 h-3" aria-hidden="true" />
              <span><strong>Support only</strong></span>
            </div>
          )}
          <button
            onClick={() => setShowNewKey(null)}
            className="w-full py-2 bg-blue-600 text-white rounded-[20px] font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            Got it
          </button>
        </div>
      </AnimatedModal>

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
              ref={inputRef}
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

          {/* Support Only Checkbox */}
          <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-[20px]">
            <input
              id="support-only"
              type="checkbox"
              checked={isSupportOnly}
              onChange={(e) => setIsSupportOnly(e.target.checked)}
              className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div>
              <label htmlFor="support-only" className="flex items-center gap-2 font-medium text-purple-900 cursor-pointer">
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                Support only key
              </label>
              <p className="text-sm text-purple-700 mt-1">
                This key will only work with the Telegram support bot and cannot be used for API requests.
                Recommended for sharing with support team.
              </p>
            </div>
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            aria-busy={createMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-blue-200 text-blue-700 rounded-[20px] transition-all duration-300 hover:bg-blue-50/90 hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.2)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {createMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" aria-hidden="true" />
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
                      {key.is_support_only && (
                        <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          <MessageCircle className="w-3 h-3" aria-hidden="true" />
                          Support only
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

      {/* Info Boxes */}
      <div className="space-y-4">
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

        <div className="bg-purple-50 border border-purple-200 rounded-[20px] p-4 flex items-start gap-3">
          <MessageCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-purple-800">
            <p className="font-medium mb-1">Support Only Keys</p>
            <p>
              Support-only keys work only with the Telegram support bot (@ai_router_support_bot) and cannot be used for API requests.
              This is useful when you need to share a key with the support team without giving them access to your API credits.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
