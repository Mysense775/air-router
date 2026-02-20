import { useQuery } from '@tanstack/react-query'
import { Wallet, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { useTranslation } from '../i18n'
import { api } from '../api/client'

interface Payout {
  id: string
  period_start: string
  period_end: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  method: string
  created_at: string
  completed_at?: string
}

interface PayoutsData {
  total_earned: number
  available_for_withdrawal: number
  pending_amount: number
  payouts: Payout[]
}

export default function InvestorPayouts() {
  useTranslation()

  const { data, isLoading } = useQuery<PayoutsData>({
    queryKey: ['investor-payouts'],
    queryFn: async () => {
      const response = await api.get('/investor/payouts')
      return response.data
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-600" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Выплачено'
      case 'pending':
        return 'В ожидании'
      case 'processing':
        return 'В обработке'
      case 'failed':
        return 'Ошибка'
      default:
        return status
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-8 h-8 text-green-600" />
          Выплаты
        </h1>
        <p className="text-gray-600 mt-1">
          Управление выплатами и вывод средств
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Всего заработано</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${(data?.total_earned || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-6 shadow-sm border border-green-200">
          <p className="text-sm text-green-600">Доступно для вывода</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            ${(data?.available_for_withdrawal || 0).toFixed(2)}
          </p>
          {data && data.available_for_withdrawal >= 50 && (
            <button className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Запросить выплату
            </button>
          )}
        </div>
        <div className="bg-yellow-50 rounded-xl p-6 shadow-sm border border-yellow-200">
          <p className="text-sm text-yellow-600">В обработке</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">
            ${(data?.pending_amount || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Minimum Payout Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Минимальная сумма выплаты: $50</p>
            <p className="text-sm text-blue-600 mt-1">
              Выплаты производятся по вторникам и пятницам. 
              Для вывода необходимо накопить минимум $50.
            </p>
          </div>
        </div>
      </div>

      {/* Payouts History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">История выплат</h2>
        </div>
        
        {data?.payouts && data.payouts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data.payouts.map((payout) => (
              <div key={payout.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  {getStatusIcon(payout.status)}
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(payout.period_start).toLocaleDateString('ru-RU')} - {new Date(payout.period_end).toLocaleDateString('ru-RU')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {getStatusText(payout.status)} • {payout.method}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${payout.amount.toFixed(2)}</p>
                  {payout.status === 'completed' && (
                    <button className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 mt-1">
                      <Download className="w-4 h-4" />
                      Чек
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">История выплат пуста</p>
            <p className="text-sm text-gray-500 mt-1">
              Выплаты будут отображаться здесь после первого вывода
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
