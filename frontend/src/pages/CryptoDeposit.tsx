import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { 
  Wallet, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Bitcoin,
  AlertCircle,
  Clock,
  ChevronDown
} from 'lucide-react'

interface Currency {
  code: string
  name: string
  network: string
  fee: string
}

interface Payment {
  id: string
  amount_usd: number
  status: string
  currency: string
  created_at: string
  completed_at: string | null
  metadata: {
    pay_address?: string
    pay_amount?: number
    pay_currency?: string
  }
}

export default function CryptoDeposit() {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('usdttrc20')
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [payment, setPayment] = useState<{
    payment_id: string
    pay_address: string
    pay_amount: number
    pay_currency: string
    payment_url: string | null
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const { data: currencies } = useQuery({
    queryKey: ['crypto-currencies'],
    queryFn: async () => {
      const res = await api.get('/payments/currencies')
      return res.data.currencies as Currency[]
    }
  })

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['payment-history'],
    queryFn: async () => {
      const res = await api.get('/payments/history')
      return res.data.payments as Payment[]
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/payments/create', {
        amount_usd: parseFloat(amount),
        currency: selectedCurrency
      })
      return res.data
    },
    onSuccess: (data) => {
      setPayment(data)
      queryClient.invalidateQueries({ queryKey: ['payment-history'] })
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to create payment')
    }
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt < 5) {
      setError('Minimum deposit amount is $5')
      return
    }
    if (amt > 10000) {
      setError('Maximum deposit amount is $10,000')
      return
    }
    createMutation.mutate()
  }

  const copyAddress = () => {
    if (payment?.pay_address) {
      navigator.clipboard.writeText(payment.pay_address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const selectedCurrencyData = currencies?.find(c => c.code === selectedCurrency)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'expired': return 'bg-gray-100 text-gray-700'
      default: return 'bg-blue-100 text-blue-700'
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bitcoin className="w-7 h-7 text-orange-500" />
          Crypto Deposit
        </h1>
        <p className="text-gray-500 mt-1">
          Deposit funds using cryptocurrency
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!payment ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Cryptocurrency
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-gray-400" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">
                        {selectedCurrencyData?.name || 'Select currency'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Network: {selectedCurrencyData?.network} • Fee: {selectedCurrencyData?.fee}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCurrencyDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {currencies?.map((currency) => (
                      <button
                        key={currency.code}
                        type="button"
                        onClick={() => {
                          setSelectedCurrency(currency.code)
                          setShowCurrencyDropdown(false)
                        }}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{currency.name}</div>
                          <div className="text-xs text-gray-500">
                            Network: {currency.network} • Fee: {currency.fee}
                          </div>
                        </div>
                        {selectedCurrency === currency.code && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  min="5"
                  max="10000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="100.00"
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Minimum: $5 • Maximum: $10,000
              </p>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Bitcoin className="w-5 h-5" />
              )}
              {createMutation.isPending ? 'Creating...' : 'Create Payment'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Payment Created!</h2>
            <p className="text-gray-500 mt-1">
              Send {payment.pay_amount.toFixed(6)} {payment.pay_currency.toUpperCase()} to the address below
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Payment ID</div>
              <div className="font-mono text-gray-900">{payment.payment_id}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1">Amount to Send</div>
              <div className="text-2xl font-bold text-gray-900">
                {payment.pay_amount.toFixed(6)} {payment.pay_currency.toUpperCase()}
              </div>
              <div className="text-sm text-gray-500">
                ≈ ${amount} USD
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Deposit Address</span>
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <code className="block break-all text-sm bg-white border rounded p-3 font-mono text-gray-900">
                {payment.pay_address}
              </code>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPayment(null)}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Create New
            </button>
            {payment.payment_url && (
              <a
                href={payment.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Wallet
              </a>
            )}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Send exact amount shown above</li>
                <li>Payment expires in 24 hours</li>
                <li>Funds will be credited automatically after confirmation</li>
                <li>Network fees are paid by sender</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Deposits</h2>
          <button
            onClick={() => refetchHistory()}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        {history?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No deposits yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history?.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${payment.amount_usd.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payment.metadata?.pay_currency?.toUpperCase() || 'Crypto'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
