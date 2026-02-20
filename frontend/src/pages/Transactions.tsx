import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/client'
import {
  Receipt,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  ExternalLink,
  Calendar,
  DollarSign,
}
from 'lucide-react'

interface Transaction {
  id: string
  user_id: string
  user_email: string
  user_name?: string
  amount_usd: number
  amount_original?: number
  currency: string
  payment_method: string
  payment_provider?: string
  provider_transaction_id?: string
  status: string
  metadata_: Record<string, any>
  created_at: string
  completed_at?: string
}

interface TransactionStats {
  by_status: Record<string, { count: number; amount: number }>
  by_method: Record<string, { count: number; amount: number }>
  today_amount: number
  month_amount: number
  total_count: number
  total_amount: number
}

export default function Transactions() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(20)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [failReason, setFailReason] = useState('')
  const [showFailModal, setShowFailModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-transactions', { status: statusFilter, method: methodFilter, search, from: fromDate, to: toDate, page, limit }],
    queryFn: async () => {
      const response = await adminApi.getTransactions({
        status: statusFilter || undefined,
        method: methodFilter || undefined,
        search: search || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        skip: page * limit,
        limit,
      })
      return response.data
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => adminApi.confirmTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
    },
  })

  const failMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminApi.failTransaction(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] })
      setShowFailModal(false)
      setFailReason('')
    },
  })

  const transactions: Transaction[] = data?.transactions || []
  const stats: TransactionStats = data?.stats || { by_status: {}, by_method: {}, today_amount: 0, month_amount: 0, total_count: 0, total_amount: 0 }
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'User', 'Email', 'Amount USD', 'Currency', 'Original Amount', 'Method', 'Status', 'TXID']
    const rows = transactions.map(tx => [
      tx.id,
      tx.created_at,
      tx.user_name || '',
      tx.user_email,
      tx.amount_usd.toFixed(2),
      tx.currency,
      tx.amount_original?.toFixed(6) || '',
      tx.payment_method,
      tx.status,
      tx.provider_transaction_id || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Receipt className="w-4 h-4 text-purple-600" />
            Транзакции
          </h1>
          <p className="text-gray-600 mt-1">Управление пополнениями и платежами</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-[20px] hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Экспорт CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-[20px]">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Сегодня</p>
              <p className="text-xl font-bold text-gray-900">${stats.today_amount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-[20px]">
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">За месяц</p>
              <p className="text-xl font-bold text-gray-900">${stats.month_amount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-[20px]">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Успешных</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.by_status.completed?.count || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-[20px]">
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">В ожидании</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.by_status.pending?.count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[20px] p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Поиск по email или TXID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Все статусы</option>
            <option value="completed">Завершено</option>
            <option value="pending">В ожидании</option>
            <option value="failed">Ошибка</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Все методы</option>
            <option value="nowpayments">NowPayments</option>
            <option value="manual">Ручное</option>
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-purple-500"
            placeholder="С"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-purple-500"
            placeholder="По"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Пользователь</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Сумма</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Крипта</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Метод</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">TXID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                    Загрузка...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-600">
                    Нет транзакций
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(tx.created_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tx.user_name || '—'}</p>
                        <p className="text-xs text-gray-600">{tx.user_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">${tx.amount_usd.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {tx.amount_original ? (
                        <span>{tx.amount_original.toFixed(6)} {tx.currency}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-700">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(tx.status)}`}>
                        {getStatusIcon(tx.status)}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono truncate max-w-[150px]">
                      {tx.provider_transaction_id || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTransaction(tx)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Детали"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        {tx.status === 'pending' && (
                          <>
                            <button
                              onClick={() => confirmMutation.mutate(tx.id)}
                              disabled={confirmMutation.isPending}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Подтвердить"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTransaction(tx)
                                setShowFailModal(true)
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Отклонить"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Показано: {transactions.length} из {total}</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(0)
              }}
              className="ml-4 px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 border border-gray-200 rounded-[20px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600">
              Страница {page + 1} из {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 border border-gray-200 rounded-[20px] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTransaction && !showFailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Детали транзакции</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-500 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">ID</span>
                <span className="font-mono text-sm">{selectedTransaction.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Пользователь</span>
                <span>{selectedTransaction.user_name || '—'} ({selectedTransaction.user_email})</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Сумма USD</span>
                <span className="font-semibold">${selectedTransaction.amount_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Криптовалюта</span>
                <span>
                  {selectedTransaction.amount_original 
                    ? `${selectedTransaction.amount_original.toFixed(6)} ${selectedTransaction.currency}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Метод</span>
                <span className="capitalize">{selectedTransaction.payment_method}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Статус</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(selectedTransaction.status)}`}>
                  {selectedTransaction.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">TXID</span>
                <span className="font-mono text-sm truncate max-w-[200px]">
                  {selectedTransaction.provider_transaction_id || '—'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Создано</span>
                <span>{new Date(selectedTransaction.created_at).toLocaleString('ru-RU')}</span>
              </div>
              {selectedTransaction.completed_at && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Завершено</span>
                  <span>{new Date(selectedTransaction.completed_at).toLocaleString('ru-RU')}</span>
                </div>
              )}
              {Object.keys(selectedTransaction.metadata_).length > 0 && (
                <div className="pt-2">
                  <span className="text-gray-600">Метаданные:</span>
                  <pre className="mt-2 p-3 bg-gray-50 rounded-[20px] text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedTransaction.metadata_, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {selectedTransaction.status === 'pending' && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    confirmMutation.mutate(selectedTransaction.id)
                    setSelectedTransaction(null)
                  }}
                  disabled={confirmMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-[20px] hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Подтвердить
                </button>
                <button
                  onClick={() => setShowFailModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-[20px] hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                  Отклонить
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fail Modal */}
      {showFailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Отклонить транзакцию</h3>
            <p className="text-gray-600">Укажите причину отклонения:</p>
            <textarea
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
              placeholder="Причина..."
              className="w-full px-4 py-2 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-red-500 min-h-[100px]"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFailModal(false)
                  setFailReason('')
                }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-[20px] hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={() => failMutation.mutate({ id: selectedTransaction.id, reason: failReason })}
                disabled={failMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-[20px] hover:bg-red-700 disabled:opacity-50"
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
