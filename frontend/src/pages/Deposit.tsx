import { useState, useEffect } from 'react'
import { CreditCard, Bitcoin, Loader2, Clock, CheckCircle, Copy, Wallet, QrCode, AlertTriangle, Shield, Zap } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi, allinApi, clientApi } from '../api/client'
import { HoverPaymentCard } from '../components/HoverButton'

interface PaymentMethod {
  id: string
  name: string
  icon: typeof CreditCard
  description: string
  minAmount: number
}

// Custom ruble icon
const RubleIcon = () => (
  <span className="text-xl font-bold">₽</span>
);

const paymentMethods: PaymentMethod[] = [
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: Bitcoin,
    description: 'USDT, BTC, ETH, LTC',
    minAmount: 10
  },
  {
    id: 'allin',
    name: 'Card / SBP',
    icon: RubleIcon as any,
    description: 'Visa, MasterCard, SBP (RUB)',
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
  const [validationError, setValidationError] = useState<string>('')
  const [showQR, setShowQR] = useState(false)

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

  // Fetch current balance
  const { data: balanceData } = useQuery({
    queryKey: ['balance'],
    queryFn: () => clientApi.getBalance(),
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

  // Real-time validation
  useEffect(() => {
    if (!amount) {
      setValidationError('')
      return
    }
    const num = parseFloat(amount)
    if (isNaN(num)) {
      setValidationError('Please enter a valid number')
    } else if (num < (selectedPayment?.minAmount || 10)) {
      setValidationError(`Minimum amount is ${selectedMethod === 'allin' ? '₽' : '$'}${selectedPayment?.minAmount || 10}`)
    } else if (num > 10000) {
      setValidationError('Maximum amount is $10,000')
    } else {
      setValidationError('')
    }
  }, [amount, selectedMethod, selectedPayment])

  const handleCreatePayment = () => {
    if (validationError || numAmount < (selectedPayment?.minAmount || 10)) {
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

  const currentBalance = balanceData?.data?.balance_usd || 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Funds</h1>
          <p className="text-gray-600 mt-1">Deposit funds via cryptocurrency or AllIn payment system</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-[20px] p-4 min-w-[200px] shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-green-500" aria-hidden="true" />
            <span className="text-sm text-gray-500">Current Balance</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">${currentBalance.toFixed(2)}</div>
        </div>
      </div>

      {/* Active Payment */}
      {activePayment && (
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-[20px] p-6 text-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Active Payment</h3>
                <p className="text-white/80 text-sm">Waiting for your transfer</p>
              </div>
            </div>
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
              {getStatusText(activePayment.status)}
            </span>
          </div>

          {/* Amount Block */}
          <div className="bg-white/10 rounded-[16px] p-4 mb-6 text-center">
            <p className="text-white/80 text-sm mb-1">Amount to send</p>
            <p className="text-3xl font-bold">${activePayment.amount_usd.toFixed(2)}</p>
            <p className="text-white/60 text-sm mt-1">USD</p>
          </div>

          {activePayment.metadata?.pay_address && (
            <div className="bg-white rounded-[20px] p-5 text-gray-900">
              {/* Currency info */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Bitcoin className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">{activePayment.metadata.pay_amount} {activePayment.metadata.pay_currency?.toUpperCase()}</p>
                  <p className="text-sm text-gray-500">Send exact amount</p>
                </div>
              </div>

              {/* QR Toggle */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  {showQR ? 'Hide QR Code' : 'Show QR Code'}
                </button>
              </div>

              {/* QR Code */}
              {showQR && (
                <div className="flex justify-center mb-4 p-6 bg-gray-50 rounded-[16px]">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activePayment.metadata.pay_address)}`}
                    alt="Payment QR Code"
                    className="w-48 h-48 rounded-[12px]"
                  />
                </div>
              )}

              {/* Address */}
              <div className="bg-gray-50 rounded-[16px] p-4">
                <p className="text-sm text-gray-500 mb-2">Deposit Address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-200 p-3 rounded-[12px] text-sm break-all font-mono text-gray-700">
                    {activePayment.metadata.pay_address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(activePayment.metadata?.pay_address || '')}
                    aria-label={copied ? "Address copied" : "Copy address to clipboard"}
                    aria-live="polite"
                    className={`p-3 rounded-[12px] transition-all ${
                      copied 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Help text */}
              <p className="text-xs text-gray-500 mt-3 text-center">
                Scan QR code with your wallet app or tap copy button
              </p>
            </div>
          )}

          {/* Create new button */}
          <button
            onClick={() => setActivePayment(null)}
            className="w-full mt-4 py-3 bg-white/80 backdrop-blur-md border border-blue-200 text-blue-700 rounded-[20px] text-sm font-medium transition-all duration-300 hover:bg-blue-50/90 hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.2)] hover:scale-[1.02]"
          >
            Create New Payment
          </button>
        </div>
      )}

      {/* New Payment Form */}
      {!activePayment && (
        <>
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span className="font-medium text-blue-600">Step 1 of 3</span>
            <span>•</span>
            <span>Choose payment method</span>
          </div>

          {/* Payment Method Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paymentMethods.map((method) => {
              const Icon = method.icon
              const isSelected = selectedMethod === method.id
              
              return (
                <HoverPaymentCard
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  isSelected={isSelected}
                  color={method.id === 'crypto' ? 'orange' : 'blue'}
                  aria-pressed={isSelected}
                  aria-label={`Select ${method.name} payment method`}
                  className={`relative p-6 rounded-[20px] border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 ${
                    isSelected
                      ? method.id === 'crypto'
                        ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-500 shadow-md focus:ring-orange-500'
                        : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-500 shadow-md focus:ring-blue-500'
                      : 'bg-white border-gray-200 hover:border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${
                      method.id === 'crypto' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}>
                      <CheckCircle className="w-4 h-4 text-white" aria-hidden="true" />
                    </div>
                  )}
                  
                  <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center mb-3 ${
                    isSelected 
                      ? method.id === 'crypto' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-blue-500 text-white'
                      : method.id === 'crypto'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-blue-100 text-blue-600'
                  }`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  
                  <h3 className={`font-semibold text-base mb-1 ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                    {method.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">{method.description}</p>
                  
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    isSelected 
                      ? method.id === 'crypto'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-100 text-blue-700'
                      : method.id === 'crypto'
                        ? 'bg-orange-50 text-orange-600'
                        : 'bg-blue-50 text-blue-600'
                  }`}>
                    Min: {method.id === 'allin' ? '₽' : '$'}{method.minAmount}
                  </div>
                </HoverPaymentCard>
              )
            })}
          </div>

          {/* Payment Details - only shown when method is selected */}
          {selectedMethod && (
            <>
              {/* Step 2 indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-6 mb-2">
                <span className="font-medium text-blue-600">Step 2 of 3</span>
                <span>•</span>
                <span>Enter amount</span>
              </div>

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
                    className="w-full px-4 py-3 border border-gray-300 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-[20px] p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Card / SBP Payment</h3>
                      <p className="text-sm text-blue-600">Secure payment via AllIn</p>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-[12px] p-3">
                    {exchangeRate ? (
                      <p className="text-sm text-blue-800">
                        Exchange rate: <strong className="text-blue-900">{exchangeRate.toFixed(2)} ₽/$</strong>
                        <span className="text-blue-600 ml-2">(CBR official)</span>
                      </p>
                    ) : (
                      <p className="text-sm text-blue-600">Loading exchange rate...</p>
                    )}
                  </div>
                </div>
              )}

              {/* Amount Input with better styling */}
              <div className="bg-white rounded-[20px] border border-gray-200 p-6">
                <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700 mb-3">
                  Enter Amount
                </label>
                <div className="relative">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-[10px] ${
                    validationError ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className="text-base font-bold">{selectedMethod === 'allin' ? '₽' : '$'}</span>
                  </div>
                  <input
                    id="amount-input"
                    type="number"
                    min={selectedPayment?.minAmount || 10}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border-2 rounded-[20px] focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-semibold transition-all duration-200 ${
                      validationError ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder={selectedMethod === 'allin' ? '1000' : '50'}
                    aria-describedby={validationError ? "amount-error" : "amount-hint"}
                    aria-invalid={validationError ? "true" : "false"}
                  />
                </div>
                
                {validationError ? (
                  <div id="amount-error" className="mt-3 p-3 bg-red-50 border border-red-200 rounded-[12px] flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm text-red-700 font-medium">{validationError}</span>
                  </div>
                ) : (
                  <div id="amount-hint" className="mt-3 flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      Min: <strong className="text-gray-700">{selectedMethod === 'allin' ? '₽' : '$'}{selectedPayment?.minAmount || 10}</strong>
                    </span>
                    {selectedMethod === 'allin' && usdEquivalent && (
                      <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        ≈ <strong>${usdEquivalent}</strong> USD
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3 indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-4 mb-2">
                <span className="font-medium text-blue-600">Step 3 of 3</span>
                <span>•</span>
                <span>Confirm and pay</span>
              </div>

              {/* Enhanced Summary Card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-[20px] p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Order Summary
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Deposit amount</span>
                    <span className="font-semibold text-lg">
                      {selectedMethod === 'allin' ? `₽${numAmount.toFixed(2)}` : `$${numAmount.toFixed(2)}`}
                    </span>
                  </div>
                  
                  {selectedMethod === 'allin' && usdEquivalent && (
                    <div className="flex justify-between items-center py-2 border-t border-gray-200/50">
                      <span className="text-gray-500 text-sm">USD equivalent</span>
                      <span className="font-medium text-blue-600">${usdEquivalent}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-2 border-t border-gray-200/50">
                    <span className="text-gray-600">Payment method</span>
                    <div className="flex items-center gap-2">
                      {selectedMethod === 'crypto' ? <Bitcoin className="w-4 h-4 text-orange-500" /> : <CreditCard className="w-4 h-4 text-blue-500" />}
                      <span className="font-medium">{selectedPayment?.name}</span>
                    </div>
                  </div>
                  
                  <div className="border-t-2 border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 text-lg">Total</span>
                      <span className="font-bold text-2xl text-blue-600">
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

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-green-50 rounded-[16px] border border-green-100">
              <div className="w-8 h-8 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs text-green-800 font-medium">Secure SSL</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-[16px] border border-blue-100">
              <div className="w-8 h-8 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-blue-800 font-medium">2-5 min avg</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-[16px] border border-purple-100">
              <div className="w-8 h-8 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-purple-800 font-medium">Guaranteed</p>
            </div>
          </div>

          {/* Enhanced Submit Button */}
          <button
            onClick={handleCreatePayment}
            disabled={!selectedMethod || !!validationError || createPaymentMutation.isPending || createAllinPaymentMutation.isPending || numAmount < (selectedPayment?.minAmount || 10)}
            aria-label={createPaymentMutation.isPending || createAllinPaymentMutation.isPending ? 'Creating payment' : 'Create payment'}
            aria-busy={createPaymentMutation.isPending || createAllinPaymentMutation.isPending}
            className="w-full bg-white/80 backdrop-blur-md border border-blue-200 text-blue-700 py-3 rounded-[20px] font-semibold text-base transition-all duration-300 hover:bg-blue-50/90 hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.2)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {createPaymentMutation.isPending || createAllinPaymentMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                {selectedMethod === 'allin' ? (
                  <>Pay ₽{numAmount.toFixed(2)}</>
                ) : selectedMethod === 'crypto' ? (
                  <>Pay ${numAmount.toFixed(2)}</>
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

      {/* Pending Payments - Table Style */}
      {pendingPayments.length > 0 && (
        <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              Pending Payments ({pendingPayments.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Clock className="w-4 h-4 text-yellow-500" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(payment.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      ${payment.amount_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment History - Table Style */}
      {completedPayments.length > 0 && (
        <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Payment History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {completedPayments.slice(0, 5).map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {(payment.completed_at || payment.created_at) && new Date(payment.completed_at || payment.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                      ${payment.amount_usd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {completedPayments.length > 5 && (
            <div className="px-6 py-3 bg-gray-50 text-center border-t border-gray-200">
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all {completedPayments.length} payments
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
