import { useQuery } from '@tanstack/react-query'
import { 
  TrendingUp, 
  Wallet, 
  Key,
  DollarSign,
  ArrowUpRight,
  Plus,
  Users,
  Copy,
  CheckCircle,
  Download
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { api } from '../api/client'
import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

interface DashboardData {
  total_accounts: number
  total_invested: number
  total_earned: number
  current_month_earned: number
  accounts: Array<{
    id: string
    name: string
    initial_balance: number
    current_balance: number
    total_earned: number
    status: string
  }>
}

// QR Code Component
function QRCodeDisplay({ url }: { url?: string }) {
  const [showModal, setShowModal] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (showModal && url && canvasRef.current) {
      // Simple QR code generation using canvas
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Clear canvas
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 200, 200)
        
        // Draw placeholder QR pattern
        ctx.fillStyle = 'black'
        const cellSize = 8
        const margin = 20
        
        // Position markers (corners)
        const drawPositionMarker = (x: number, y: number) => {
          ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize)
          ctx.fillStyle = 'white'
          ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize)
          ctx.fillStyle = 'black'
          ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize)
        }
        
        drawPositionMarker(margin, margin)
        drawPositionMarker(margin + 140, margin)
        drawPositionMarker(margin, margin + 140)
        
        // Draw data pattern (simplified)
        for (let i = 0; i < 15; i++) {
          for (let j = 0; j < 15; j++) {
            if (Math.random() > 0.5) {
              ctx.fillRect(margin + 40 + i * cellSize, margin + j * cellSize, cellSize - 1, cellSize - 1)
            }
          }
        }
        
        // Add URL text below
        ctx.font = '10px monospace'
        ctx.fillStyle = 'gray'
        ctx.textAlign = 'center'
        ctx.fillText(url.slice(0, 30) + '...', 100, 195)
      }
    }
  }, [showModal, url])

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = 'referral-qr-code.png'
      link.href = canvasRef.current.toDataURL()
      link.click()
    }
  }

  if (!url) return null

  return (
    <>
      <div className="bg-gray-50 rounded-[20px] p-4 text-center">
        <div className="w-24 h-24 bg-white border-2 border-gray-200 rounded-[20px] mx-auto mb-2 flex items-center justify-center cursor-pointer hover:border-green-500 transition-colors"
             onClick={() => setShowModal(true)}
             role="button"
             aria-label="Show QR code"
             tabIndex={0}
        >
          <div className="grid grid-cols-5 gap-0.5 p-2">
            {[...Array(25)].map((_, i) => (
              <div key={i} className={`w-3 h-3 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`} />
            ))}
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="text-sm text-green-600 hover:text-green-700 font-medium"
        >
          Показать QR
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[20px] p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">QR-код реферальной ссылки</h3>
            <canvas 
              ref={canvasRef} 
              width={200} 
              height={200} 
              className="mx-auto border border-gray-200 rounded-[20px]"
            />
            <div className="mt-4 space-y-2">
              <button
                onClick={downloadQR}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-[20px] hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Скачать PNG
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-[20px] hover:bg-gray-50 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function InvestorDashboard() {
  const { t } = useTranslation()
  
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['investor-dashboard'],
    queryFn: async () => {
      const response = await api.get('/investor/dashboard')
      return response.data
    }
  })

  // Referral stats
  const { data: referralData } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const response = await api.get('/auth/referral/stats')
      return response.data
    }
  })

  const [copied, setCopied] = useState(false)

  const copyReferralLink = () => {
    if (referralData?.referral_url) {
      navigator.clipboard.writeText(referralData.referral_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const stats = [
    {
      title: t('investor.totalInvested') || 'Всего инвестировано',
      value: `$${(data?.total_invested || 0).toFixed(2)}`,
      icon: Wallet,
      color: 'blue'
    },
    {
      title: t('investor.totalEarned') || 'Всего заработано',
      value: `$${(data?.total_earned || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: t('investor.thisMonth') || 'В этом месяце',
      value: `$${(data?.current_month_earned || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'purple'
    },
    {
      title: t('investor.activeKeys') || 'Активные ключи',
      value: data?.total_accounts || 0,
      icon: Key,
      color: 'orange'
    }
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('investor.dashboardTitle') || 'Инвесторский дашборд'}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('investor.dashboardSubtitle') || 'Управляйте вашими инвестициями и следите за доходом'}
          </p>
        </div>
        <Link
          to="/investor/keys/add"
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-[20px] hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('investor.addKey') || 'Добавить ключ'}
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div key={i} className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <Icon className={`w-4 h-4 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Referral Program Section */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              Реферальная программа
            </h2>
            <p className="text-gray-600 mb-4">
              Приглашайте друзей и получайте +0.5% от их оборота
            </p>
            
            {referralData?.referral_url && (
              <div className="bg-gray-50 rounded-[20px] p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Ваша реферальная ссылка:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-800">
                    {referralData.referral_url}
                  </code>
                  <button
                    onClick={copyReferralLink}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-[20px] hover:bg-green-700 transition-colors"
                  >
                    {copied ? (
                      <><CheckCircle className="w-4 h-4" /> Скопировано</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Копировать</>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {referralData && (
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-[20px] p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{referralData.total_clicks || 0}</p>
                  <p className="text-xs text-gray-600">Переходов</p>
                </div>
                <div className="bg-purple-50 rounded-[20px] p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">{referralData.registered_referrals || 0}</p>
                  <p className="text-xs text-gray-600">Регистраций</p>
                </div>
                <div className="bg-orange-50 rounded-[20px] p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{referralData.active_referrals || 0}</p>
                  <p className="text-xs text-gray-600">Активных</p>
                </div>
                <div className="bg-green-50 rounded-[20px] p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">${(referralData.total_earnings_usd || 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-600">Заработано</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="hidden md:block ml-6">
            <QRCodeDisplay url={referralData?.referral_url} />
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="bg-white rounded-[20px] shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('investor.myAccounts') || 'Мои аккаунты'}
          </h2>
        </div>
        
        {data?.accounts && data.accounts.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data.accounts.map((account) => (
              <div key={account.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    account.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-sm text-gray-600">
                      {t('investor.initial') || 'Начальный'}: ${account.initial_balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${account.current_balance.toFixed(2)}</p>
                  <p className="text-sm text-green-600">
                    +${account.total_earned.toFixed(2)} {t('investor.earned') || 'заработано'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{t('investor.noAccounts') || 'Нет аккаунтов'}</p>
            <Link
              to="/investor/keys/add"
              className="inline-flex items-center gap-2 mt-4 text-green-600 hover:text-green-700"
            >
              {t('investor.addFirst') || 'Добавить первый ключ'}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
