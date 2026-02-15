import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Key, Info, Loader2 } from 'lucide-react'
import { useTranslation } from '../i18n'
import { api } from '../api/client'
import { Link, useNavigate } from 'react-router-dom'

export default function AddInvestorKey() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    initialBalance: 100,
    minThreshold: 50,
    agreeToTerms: false
  })
  const [error, setError] = useState('')

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/investor/accounts', {
        name: data.name,
        api_key: data.apiKey,
        initial_balance: data.initialBalance,
        min_threshold: data.minThreshold
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investor-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['investor-dashboard'] })
      navigate('/investor/keys')
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Ошибка добавления ключа')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.agreeToTerms) {
      setError(t('investor.mustAgree') || 'Необходимо согласиться с условиями')
      return
    }
    
    if (formData.apiKey.length < 10) {
      setError(t('investor.invalidKey') || 'Неверный API ключ')
      return
    }
    
    addMutation.mutate(formData)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/investor/keys"
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('investor.addKeyTitle') || 'Добавить ключ'}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('investor.addKeySubtitle') || 'Добавьте ваш OpenRouter API ключ'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('investor.keyName') || 'Название ключа'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('investor.keyNamePlaceholder') || 'Например: Мой ключ #1'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="sk-or-v1-..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {t('investor.keyHint') || 'Ключ будет зашифрован и хранится безопасно'}
            </p>
          </div>

          {/* Initial Balance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('investor.initialBalance') || 'Начальный баланс ($)'}
            </label>
            <input
              type="number"
              min={100}
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {t('investor.minBalanceHint') || 'Минимум $100. Укажите текущий баланс вашего ключа.'}
            </p>
          </div>

          {/* Min Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('investor.minThreshold') || 'Минимальный порог ($)'}
            </label>
            <input
              type="number"
              min={10}
              value={formData.minThreshold}
              onChange={(e) => setFormData({ ...formData, minThreshold: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {t('investor.thresholdHint') || 'При достижении этого баланса ключ будет отключен. Рекомендуется $50.'}
            </p>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={formData.agreeToTerms}
              onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
              className="mt-1 w-4 h-4 text-green-600 rounded border-gray-300"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              {t('investor.terms') || 
                'Я согласен с условиями: я получаю 1% от расходов через мой ключ. Выплаты производятся ежемесячно при накоплении минимум $50. Я могу отозвать ключ с предупреждением за 7 дней.'}
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Link
              to="/investor/keys"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center transition-colors"
            >
              {t('common.cancel') || 'Отмена'}
            </Link>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('investor.adding') || 'Добавление...'}
                </>
              ) : (
                t('investor.addKey') || 'Добавить ключ'
              )}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">{t('investor.important') || 'Важно:'}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('investor.info1') || 'Ключ будет использоваться для запросов наших клиентов'}</li>
              <li>{t('investor.info2') || 'Вы можете видеть статистику использования в реальном времени'}</li>
              <li>{t('investor.info3') || 'Вы в любой момент можете отозвать ключ'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
