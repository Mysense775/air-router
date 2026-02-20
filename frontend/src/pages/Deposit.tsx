import { useState, useEffect } from 'react'
import { CreditCard, Bitcoin, ChevronRight, Loader2, Clock, CheckCircle, XCircle, Copy } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi, allinApi } from '../api/client'

interface PaymentMethod {
  id: string
  name: string
  icon: typeof CreditCard
  description: string
  minAmount: number
}

// Custom ruble icon component
const RubleIcon = () => (
  <span className="text-xl font-bold" aria-label="Russian Ruble">₽</span>
);

const paymentMethods: PaymentMethod[] = [
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: Bitcoin,
    description: 'USDT, BTC, ETH via NowPayments',
    minAmount: 10
  },
  {
    id: 'allin',
    name: 'AllIn',
    icon: RubleIcon as any,
    description: 'Pay via AllIn payment system (Cards, SBP) - Amount in RUB',
    minAmount: 300
  }
]

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

export default function Deposit() {
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [amount, setAmount] = useState('50')
  const [selectedCurrency, setSelectedCurrency] = useState('usdttrc20')
  const [activePayment, setActivePayment] = useState<Payment | null>(null)
  const [copied, setCopied] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)

  // Fetch payment history
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['payments', 'history'],
    queryFn: () => adminApi.getPaymentHistory(),
  })

  // Fetch supported currencies
  const { data: currenciesData } = useQuery({
    queryKey: ['payments', 'currencies'],
    queryFn: () => adminApi.getCryptoCurrencies(),
  })

  // Fetch exchange rate when AllIn is selected
  const { data: exchangeRateData } = useQuery({
    queryKey: ['exchange-rate'],
    queryFn: () => allinApi.getExchangeRate(),
    enabled: selectedMethod === 'allin',
    refetchInterval: 60000, // Refresh every minute
  })

  useEffect(() => {
    if (exchangeRateData?.data?.rate) {
      setExchangeRate(exchangeRateData.data.rate)
    }
  }, [exchangeRateData])

  const currencies = currenciesData?.data?.currencies || []

  // Create crypto payment mutation

  // Create crypto payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: () => adminApi.createCryptoPayment(parseFloat(amount), selectedCurrency),
    onSuccess: (response) => {
      setActivePayment({
        id: response.data.payment_id,
        amount_usd: parseFloat(amount),
        status: 'waiting',
        currency: 'USD',
        created_at: new Date().toISOString(),
        completed_at: null,
        metadata: {
          pay_address: response.data.pay_address,
          pay_amount: response.data.pay_amount,
          pay_currency: response.data.pay_currency
        }
      })
      refetchHistory()
    }
  })

  // Create AllIn payment mutation
  const createAllinPaymentMutation = useMutation({
    mutationFn: () => allinApi.createPayment(parseFloat(amount), 'RUB'),
    onSuccess: (response) => {
      if (response.data?.payment_url) {
        window.location.href = response.data.payment_url
      } else {
        console.error('No payment_url in response:', response)
      }
    }
  })

  const payments: Payment[] = historyData?.data?.payments || []
  const pendingPayments = payments.filter(p => ['pending', 'waiting', 'confirming'].includes(p.status))
  const completedPayments = payments.filter(p => ['completed', 'finished', 'confirmed'].includes(p.status))

  const selectedPayment = paymentMethods.find(m => m.id === selectedMethod)
  const numAmount = parseFloat(amount) || 0

  // Calculate USD equivalent for AllIn
  const usdEquivalent = selectedMethod === 'allin' && exchangeRate && numAmount > 0
    ? (numAmount / exchangeRate).toFixed(2)
    : null

  const handleCreatePayment = () => {
    if (numAmount < (selectedPayment?.minAmount || 10)) {
      return
    }
    if (selectedMethod === 'allin') {
      createAllinPaymentMutation.mutate()
    } else {
      createPaymentMutation.mutate()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'finished':
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
      case 'waiting':
      case 'confirming':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'Completed',
      'finished': 'Completed',
      'confirmed': 'Confirmed',
      'pending': 'Pending',
      'waiting': 'Waiting',
      'confirming': 'Confirming',
      'failed': 'Failed',
      'expired': 'Expired'
    }
    return statusMap[status] || status
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Funds</h1>
        <p className="text-gray-600 mt-1">Deposit funds via cryptocurrency or AllIn payment system</p>
      </div>

      {/* Active Payment */}
      {activePayment && (
        <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Active Payment</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount:</span>
              <span className="font-bold text-lg">${activePayment.amount_usd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <span className="flex items-center gap-2">
                {getStatusIcon(activePayment.status)}
                {getStatusText(activePayment.status)}
              </span>
            </div>
            {activePayment.metadata?.pay_address && (
              <div className="bg-white rounded-[20px] p-4">
                <p className="text-sm text-gray-600 mb-2">Send {activePayment.metadata.pay_amount} {activePayment.metadata.pay_currency?.toUpperCase()} to:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 p-2 rounded text-sm break-all">
                    {activePayment.metadata.pay_address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(activePayment.metadata?.pay_address || '')}
                    aria-label={copied ? "Address copied" : "Copy address to clipboard"}
                    aria-live="polite"
                    className="p-2 hover:bg-gray-200 rounded-[20px] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" /> : <Copy className="w-4 h-4 text-gray-600" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => setActivePayment(null)}
              className="text-blue-600 hover:text-blue-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Create new payment
            </button>
          </div>
        </div>
      )}

      {/* New Payment Form */}
      {!activePayment && (
        <>
          {/* Payment Method */}
          <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Payment Method</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {paymentMethods.map((method) => {
                const Icon = method.icon
                const isSelected = selectedMethod === method.id
                
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    aria-pressed={isSelected}
                    aria-label={`Select ${method.name} payment method`}
                    className={`w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <div className={`p-3 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} aria-hidden="true" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-medium text-gray-900">{method.name}</h3>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      Min: {method.id === 'allin' ? '₽' : '$'}{method.minAmount}
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-blue-600' : 'text-gray-600'}`} aria-hidden="true" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Payment Details - only shown when method is selected */}
          {selectedMethod && (
            <>
              {/* Currency Selection - only for crypto */}
              {selectedMethod === 'crypto' && (
                <div className="bg-white rounded-[20px] border border-gray-200 p-6">
                  <label htmlFor="currency-select" className="block text-sm font-medium text-gray-700 mb-3">
                    Select Cryptocurrency
                  </label>
                  <select
                    id="currency-select"
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map((curr: any) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name} ({curr.network}) - {curr.fee} fees
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* AllIn Info - only for allin */}
              {selectedMethod === 'allin' && (
                <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-6">
                  <h3 className="font-medium text-blue-900 mb-2">AllIn Payment</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    You will be redirected to AllIn payment page to complete your payment via card or SBP.
                  </p>
                  {exchangeRate ? (
                    <p className="text-sm text-blue-600">
                      Current exchange rate: <strong>{exchangeRate.toFixed(2)} ₽/$</strong> (CBR)
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">Loading exchange rate...</p>
                  )}
                </div>
              )}

              {/* Amount */}
              <div className="bg-white rounded-[20px] border border-gray-200 p-6">
                <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedMethod === 'allin' ? 'Amount (RUB)' : 'Amount (USD)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" aria-hidden="true">
                    {selectedMethod === 'allin' ? '₽' : '$'}
                  </span>
                  <input
                    id="amount-input"
                    type="number"
                    min={selectedPayment?.minAmount || 10}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder={selectedMethod === 'allin' ? '1000' : '50'}
                    aria-describedby="amount-min"
                  />
                </div>
                <p id="amount-min" className="text-sm text-gray-600 mt-2">
                  Minimum: {selectedMethod === 'allin' ? '₽' : '$'}{selectedPayment?.minAmount || 10}
                </p>
                {selectedMethod === 'allin' && usdEquivalent && (
                  <p className="text-sm text-blue-600 mt-1">
                    ≈ ${usdEquivalent} USD
                    {exchangeRate && (
                      <span className="text-gray-500 ml-2">(rate: {exchangeRate.toFixed(2)} ₽/$)</span>
                    )}
                  </p>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-[20px] p-6">
                <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deposit amount</span>
                    <span className="font-medium">
                      {selectedMethod === 'allin' ? `₽${numAmount.toFixed(2)}` : `$${numAmount.toFixed(2)}`}
                    </span>
                  </div>
                  {selectedMethod === 'allin' && usdEquivalent && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">≈ USD equivalent</span>
                      <span className="font-medium text-blue-600">${usdEquivalent}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Payment method</span>
                    <span className="font-medium">{selectedPayment?.name}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-xl text-gray-900">
                        {selectedMethod === 'allin' ? `₽${numAmount.toFixed(2)}` : `$${numAmount.toFixed(2)}`}
                      </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          {(createPaymentMutation.isError || createAllinPaymentMutation.isError) && (
            <div className="bg-red-50 border border-red-200 rounded-[20px] p-4 text-red-700" role="alert" aria-live="polite">
              {(createPaymentMutation.error as any)?.response?.data?.detail || 
               (createAllinPaymentMutation.error as any)?.response?.data?.detail || 
               'Failed to create payment'}
            </div>
          )}

          <button
            onClick={handleCreatePayment}
            disabled={!selectedMethod || createPaymentMutation.isPending || createAllinPaymentMutation.isPending || numAmount < (selectedPayment?.minAmount || 10)}
            aria-label={createPaymentMutation.isPending || createAllinPaymentMutation.isPending ? 'Creating payment' : 'Create payment'}
            aria-busy={createPaymentMutation.isPending || createAllinPaymentMutation.isPending}
            className="w-full bg-blue-600 text-white py-4 rounded-[20px] font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {createPaymentMutation.isPending || createAllinPaymentMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Creating payment...
              </>
            ) : (
              <>
                {selectedMethod === 'allin' ? (
                  <>Create Payment ₽{numAmount.toFixed(2)}</>
                ) : selectedMethod === 'crypto' ? (
                  <>Create Payment ${numAmount.toFixed(2)}</>
                ) : (
                  <>Select payment method</>
                )}
              </>
            )}
          </button>
            </>
          )}
        </>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Pending Payments</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(payment.status)}
                  <div>
                    <p className="font-medium text-gray-900">${payment.amount_usd.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{new Date(payment.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-yellow-600">
                  {getStatusText(payment.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {completedPayments.length > 0 && (
        <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Payment History</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {completedPayments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(payment.status)}
                  <div>
                    <p className="font-medium text-gray-900">${payment.amount_usd.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      {payment.completed_at 
                        ? new Date(payment.completed_at).toLocaleDateString()
                        : new Date(payment.created_at).toLocaleDateString()
                      }
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600">
                  {getStatusText(payment.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
