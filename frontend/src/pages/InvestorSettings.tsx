import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Settings, Bell, Shield, User, Mail, Save } from 'lucide-react'
import { useTranslation } from '../i18n'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

interface UserSettings {
  name: string
  email: string
  notifications: {
    email_enabled: boolean
    low_balance_alert: boolean
    payout_notifications: boolean
    referral_notifications: boolean
  }
  security: {
    two_factor_enabled: boolean
  }
}

export default function InvestorSettings() {
  useTranslation()
  const { user } = useAuthStore()
  const [successMessage, setSuccessMessage] = useState('')

  const { data, isLoading } = useQuery<UserSettings>({
    queryKey: ['investor-settings'],
    queryFn: async () => {
      const response = await api.get('/auth/me')
      return response.data
    }
  })

  const [formData, setFormData] = useState<UserSettings>({
    name: '',
    email: '',
    notifications: {
      email_enabled: true,
      low_balance_alert: true,
      payout_notifications: true,
      referral_notifications: true
    },
    security: {
      two_factor_enabled: false
    }
  })

  // Update form when data loads
  useState(() => {
    if (data) {
      setFormData(data)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const response = await api.put('/auth/me', settings)
      return response.data
    },
    onSuccess: () => {
      setSuccessMessage('Настройки сохранены')
      setTimeout(() => setSuccessMessage(''), 3000)
    }
  })

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-4 h-4 text-green-600" />
          Настройки
        </h1>
        <p className="text-gray-600 mt-1">
          Управление профилем и предпочтениями
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-[20px] flex items-center gap-2 text-green-800">
          <Save className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Section */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-600" />
            Профиль
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ваше имя"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-[20px] bg-gray-50 text-gray-600"
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">Email нельзя изменить</p>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-600" />
            Уведомления
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-[20px] cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Email уведомления</p>
                <p className="text-sm text-gray-600">Получать важные уведомления на email</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.email_enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, email_enabled: e.target.checked }
                })}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-[20px] cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Низкий баланс</p>
                <p className="text-sm text-gray-600">Уведомлять когда баланс ключа меньше $20</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.low_balance_alert}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, low_balance_alert: e.target.checked }
                })}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-[20px] cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Выплаты</p>
                <p className="text-sm text-gray-600">Уведомлять о статусе выплат</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.payout_notifications}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, payout_notifications: e.target.checked }
                })}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-[20px] cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Рефералы</p>
                <p className="text-sm text-gray-600">Уведомлять о новых рефералах</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.referral_notifications}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, referral_notifications: e.target.checked }
                })}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
            </label>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-600" />
            Безопасность
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-[20px]">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900">Сменить пароль</p>
                <button className="text-sm text-green-600 hover:text-green-700">
                  Изменить
                </button>
              </div>
              <p className="text-sm text-gray-600">Последнее изменение: никогда</p>
            </div>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-[20px] cursor-pointer">
              <div>
                <p className="font-medium text-gray-900">Двухфакторная аутентификация</p>
                <p className="text-sm text-gray-600">Дополнительный уровень защиты</p>
              </div>
              <input
                type="checkbox"
                checked={formData.security.two_factor_enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  security: { ...formData.security, two_factor_enabled: e.target.checked }
                })}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
            </label>
          </div>
        </div>

        {/* Referral Info */}
        <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Реферальная программа</h2>
          
          <div className="p-4 bg-green-50 rounded-[20px]">
            <p className="text-sm text-gray-600 mb-2">Ваш реферальный код:</p>
            <code className="block px-3 py-2 bg-white rounded border border-green-200 text-green-700 font-mono">
              {(user as any)?.referral_code || 'Не создан'}
            </code>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>Приглашайте друзей и получайте +0.5% от их оборота</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-[20px] hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {updateMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Сохранить изменения
            </>
          )}
        </button>
      </div>
    </div>
  )
}
