import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Key, Copy, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { apiKeysApi } from '../api/client'
import { ApiKey } from '../types'

export default function ApiKeysPage() {
  const [newKeyName, setNewKeyName] = useState('')
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => apiKeysApi.getApiKeys(),
  })

  const createMutation = useMutation({
    mutationFn: () => apiKeysApi.createApiKey(newKeyName || 'New Key'),
    onSuccess: (response) => {
      setShowNewKey(response.data.key)
      setNewKeyName('')
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => apiKeysApi.revokeApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] })
    },
  })

  const apiKeys: ApiKey[] = data?.data || []

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-500">Manage your API keys for accessing the platform</p>
        </div>
      </div>

      {/* New Key Modal/Form */}
      {showNewKey && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold mb-2">New API Key Created!</h3>
              <p className="text-sm opacity-90 mb-4">
                Copy this key now. You won't be able to see it again.
              </p>
              <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
                <code className="font-mono text-sm break-all">{showNewKey}</code>
                <button
                  onClick={() => copyToClipboard(showNewKey)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowNewKey(null)}
              className="text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Create New Key */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New API Key</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production, Development)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Create Key
          </button>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Your API Keys</h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No API keys yet</p>
            <p className="text-sm">Create your first key to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${key.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Key className={`w-5 h-5 ${key.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="text-sm text-gray-500">
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && ` • Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      key.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {key.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {key.is_active && (
                    <button
                      onClick={() => revokeMutation.mutate(key.id)}
                      disabled={revokeMutation.isPending}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
