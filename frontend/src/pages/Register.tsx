import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/client'
import { UserPlus, AlertCircle, CheckCircle, Gift, Users, Key } from 'lucide-react'

type UserRole = 'client' | 'investor'

export default function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'client' as UserRole
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  // Check referral code validity on load
  useEffect(() => {
    if (referralCode) {
      // Could validate code here via API
      console.log('Referral code:', referralCode)
    }
  }, [referralCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      // Use different endpoint for referral registration
      if (referralCode) {
        await authApi.registerViaReferral(
          formData.email,
          formData.password,
          formData.name || undefined,
          referralCode
        )
      } else {
        await authApi.register(
          formData.email,
          formData.password,
          formData.name || undefined,
          formData.role
        )
      }

      setSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            {referralCode ? 'Registration Successful! 🎉' : 'Registration Successful!'}
          </h2>
          <p className="text-gray-300">
            {referralCode 
              ? 'You received $5 welcome bonus! Redirecting to login...' 
              : 'Redirecting to login...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {referralCode ? 'Join by Invitation' : 'Create Account'}
            </h1>
            <p className="text-gray-300 mt-2">
              {referralCode 
                ? 'Register using referral link and get $5 bonus!' 
                : 'Register to access AI Router API'}
            </p>
          </div>

          {/* Referral Banner */}
          {referralCode && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-green-200 text-sm font-medium">Referral Bonus Active!</p>
                  <p className="text-green-300 text-xs">You'll receive $5 on your balance after registration</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3" role="alert" aria-live="polite">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" aria-hidden="true" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection - Only show for regular registration */}
            {!referralCode && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Role *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'client' })}
                    aria-label="Select Client role"
                    aria-pressed={formData.role === 'client'}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.role === 'client'
                        ? 'bg-blue-600/30 border-blue-500 text-white'
                        : 'bg-slate-800/50 border-slate-600 text-gray-500 hover:border-slate-500'
                    }`}
                  >
                    <Users className="w-6 h-6" aria-hidden="true" />
                    <span className="text-sm font-medium">Client</span>
                    <span className="text-xs opacity-70">Use AI API</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'investor' })}
                    aria-label="Select Investor role"
                    aria-pressed={formData.role === 'investor'}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      formData.role === 'investor'
                        ? 'bg-green-600/30 border-green-500 text-white'
                        : 'bg-slate-800/50 border-slate-600 text-gray-500 hover:border-slate-500'
                    }`}
                  >
                    <Key className="w-6 h-6" aria-hidden="true" />
                    <span className="text-sm font-medium">Investor</span>
                    <span className="text-xs opacity-70">Earn with keys</span>
                  </button>
                </div>
              </div>
            )}

            {/* Referral role info */}
            {referralCode && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-200 text-sm text-center">
                  Role: <strong>Client</strong> (fixed for referrals)
                </p>
              </div>
            )}

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                id="reg-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="your@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="reg-name" className="block text-sm font-medium text-gray-300 mb-2">
                Name (optional)
              </label>
              <input
                id="reg-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-2">
                Password *
              </label>
              <input
                id="reg-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password *
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Repeat password"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
            >
              {loading ? 'Creating Account...' : referralCode ? 'Create Account & Get $5' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
