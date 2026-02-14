import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api/client'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('test123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitAttempted = useRef(false)

  const loginMutation = useMutation({
    mutationFn: async () => {
      // Prevent double submission with ref
      if (submitAttempted.current) {
        throw new Error('Login already in progress')
      }
      submitAttempted.current = true
      setIsSubmitting(true)
      
      try {
        const response = await authApi.login(email, password)
        const { access_token, refresh_token } = response.data
        
        // Get user info with token directly (bypass interceptor timing issue)
        const userRes = await authApi.getMe(access_token)
        
        // Save auth with full user data
        setAuth(access_token, refresh_token, userRes.data)
        
        return response
      } finally {
        setIsSubmitting(false)
        // Reset ref after a delay to allow retry on error
        setTimeout(() => {
          submitAttempted.current = false
        }, 1000)
      }
    },
    onSuccess: () => {
      navigate('/dashboard')
    },
    onError: (err: any) => {
      setIsSubmitting(false)
      submitAttempted.current = false
      setError(err.response?.data?.detail || err.message || 'Login failed')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl">
            <Zap className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          AI Router Platform
        </h1>
        <p className="text-center text-gray-500 mb-8">
          OpenRouter Reseller API
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loginMutation.isPending}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(isSubmitting || loginMutation.isPending) ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Test account:</p>
          <p>test@example.com / test123</p>
        </div>
      </div>
    </div>
  )
}
