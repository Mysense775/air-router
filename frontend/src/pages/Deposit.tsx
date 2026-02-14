import { useState } from 'react'
import { CreditCard, Bitcoin, Wallet, ChevronRight, Loader2 } from 'lucide-react'

interface PaymentMethod {
  id: string
  name: string
  icon: typeof CreditCard
  description: string
  minAmount: number
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'stripe',
    name: 'Credit Card',
    icon: CreditCard,
    description: 'Visa, Mastercard, Apple Pay',
    minAmount: 5
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: Bitcoin,
    description: 'BTC, ETH, USDT',
    minAmount: 10
  },
  {
    id: 'yookassa',
    name: 'YooKassa',
    icon: Wallet,
    description: 'SBP, Карты РФ',
    minAmount: 100
  }
]

export default function Deposit() {
  const [selectedMethod, setSelectedMethod] = useState<string>('stripe')
  const [amount, setAmount] = useState('50')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleDeposit = async () => {
    const numAmount = parseFloat(amount)
    const method = paymentMethods.find(m => m.id === selectedMethod)
    
    if (!method) return
    
    if (numAmount < method.minAmount) {
      setError(`Minimum amount for ${method.name} is $${method.minAmount}`)
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // В реальности здесь был бы запрос к платёжному шлюзу
      // Сейчас демо-режим: просто показываем инструкцию
      setSuccess(`Redirecting to ${method.name} payment...`)
      
      // Через 2 секунды показываем "демо-успех"
      setTimeout(() => {
        setSuccess(`Demo: Deposit of $${numAmount} via ${method.name} initiated!`)
        setLoading(false)
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Payment failed')
      setLoading(false)
    }
  }

  const selectedPayment = paymentMethods.find(m => m.id === selectedMethod)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Funds</h1>
        <p className="text-gray-500 mt-1">Choose payment method and amount</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Payment Methods */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                className={`w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'
                }`}
              >
                <div className={`p-3 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">{method.name}</h3>
                  <p className="text-sm text-gray-500">{method.description}</p>
                </div>
                <div className="text-sm text-gray-500">
                  Min: ${method.minAmount}
                </div>
                <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? 'rotate-90 text-blue-600' : 'text-gray-400'}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Amount */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Amount (USD)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            min={selectedPayment?.minAmount || 5}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            placeholder="50"
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Minimum: ${selectedPayment?.minAmount || 5}
        </p>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Deposit amount</span>
            <span className="font-medium">${parseFloat(amount || '0').toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Payment method</span>
            <span className="font-medium">{selectedPayment?.name}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-xl text-gray-900">${parseFloat(amount || '0').toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleDeposit}
        disabled={loading || !amount || parseFloat(amount) < (selectedPayment?.minAmount || 5)}
        className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay ${parseFloat(amount || '0').toFixed(2)}</>
        )}
      </button>

      <p className="text-center text-sm text-gray-500">
        Secure payment processing. Your funds will be added instantly after confirmation.
      </p>
    </div>
  )
}
