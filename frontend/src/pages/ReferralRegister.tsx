import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import { 
  UserPlus, 
  Gift, 
  User, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Wallet,
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface ReferrerInfo {
  name: string
  email?: string
  code: string
}

export default function ReferralRegister() {
  console.log('ReferralRegister v2026.02.18 rendered')
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const referralCode = code || ''
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [referrerInfo, setReferrerInfo] = useState<ReferrerInfo | null>(null)
  const [codeValid, setCodeValid] = useState(true)

  // Проверяем реферальный код при загрузке
  useEffect(() => {
    if (!referralCode) {
      setCodeValid(false)
      return
    }
    
    // Здесь можно сделать API запрос для валидации кода и получения инфы о реферере
    // Пока используем заглушку
    setReferrerInfo({
      name: 'Инвестор AI Router',
      code: referralCode
    })
  }, [referralCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (formData.password.length < 8) {
      setError('Пароль должен быть не менее 8 символов')
      return
    }

    if (!formData.agreeToTerms) {
      setError('Необходимо согласиться с условиями использования')
      return
    }

    if (!referralCode) {
      setError('Реферальный код не найден')
      return
    }

    setLoading(true)

    try {
      await authApi.registerViaReferral(
        formData.email,
        formData.password,
        formData.name || undefined,
        referralCode
      )

      setSuccess(true)
      
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при регистрации')
    } finally {
      setLoading(false)
    }
  }

  if (!codeValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Неверная ссылка</h2>
          <p className="text-gray-300 mb-4">Реферальный код не найден или устарел.</p>
          <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Зарегистрироваться без приглашения →
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Регистрация успешна!</h2>
          <p className="text-gray-300 mb-2">Вы получили</p>
          <p className="text-4xl font-bold text-green-400 mb-4">$5</p>
          <p className="text-gray-300 mb-4">на ваш баланс. Перенаправляем на вход...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-5">
          
          {/* ЛЕВАЯ КОЛОНКА - Форма регистрации */}
          <div className="lg:col-span-3 p-8 lg:p-12">
            <div className="max-w-md mx-auto">
              {/* Заголовок */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-6 h-6 text-indigo-600" />
                  <span className="text-sm text-indigo-600 font-medium">Регистрация по приглашению</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Создать аккаунт</h1>
                <p className="text-gray-500 mt-2">
                  Присоединяйтесь к AI Router и получите бонус
                </p>
              </div>

              {/* Ошибка */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Форма */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Имя <span className="text-gray-400">(опционально)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Как к вам обращаться?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Пароль <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Минимум 8 символов"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Повторите пароль <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Введите пароль ещё раз"
                    required
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.agreeToTerms}
                    onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                    className="mt-1 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">
                    Я согласен с{' '}
                    <Link to="/terms" className="text-indigo-600 hover:text-indigo-700 underline">
                      условиями использования
                    </Link>
                    {' '}и{' '}
                    <Link to="/privacy" className="text-indigo-600 hover:text-indigo-700 underline">
                      политикой конфиденциальности
                    </Link>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Создание аккаунта...
                    </>
                  ) : (
                    <>
                      <span>Создать аккаунт и получить $5</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Уже есть аккаунт?{' '}
                  <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                    Войти
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА - Информация о бонусах */}
          <div className="lg:col-span-2 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-8 lg:p-12 text-white flex flex-col justify-center">
            
            {/* Блок бонуса */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-6 h-6" />
                <span className="text-green-100 font-medium">Вы получите</span>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                <p className="text-6xl font-bold mb-2">$5</p>
                <p className="text-green-100">На ваш баланс сразу после регистрации</p>
              </div>
            </div>

            {/* Кто пригласил */}
            {referrerInfo && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5" />
                  <span className="text-green-100 font-medium">Вас пригласил</span>
                </div>
                
                <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                      {referrerInfo.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{referrerInfo.name}</p>
                      <p className="text-green-200 text-sm">Инвестор AI Router</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-200 mt-3 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Получает бонусы за активных рефералов
                  </p>
                </div>
              </div>
            )}

            {/* Преимущества */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Преимущества платформы
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">$5 бонусом</p>
                    <p className="text-sm text-green-100">Сразу на баланс после регистрации</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">100+ AI моделей</p>
                    <p className="text-sm text-green-100">Доступ к GPT-4, Claude, Gemini и другим</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Цены ниже на 10-20%</p>
                    <p className="text-sm text-green-100">Чем напрямую у OpenRouter</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-200 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Простая интеграция</p>
                    <p className="text-sm text-green-100">OpenAI-compatible API</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Как это работает */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Как это работает
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
                  <span>Создаёте аккаунт</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
                  <span>Получаете $5 бонусом</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">3</span>
                  <span>Используете API с баланса</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
