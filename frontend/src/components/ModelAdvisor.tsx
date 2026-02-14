import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { 
  Brain, 
  Sparkles, 
  X, 
  Loader2, 
  CheckCircle,
  DollarSign,
  Zap,
  Crown,
  Copy,
  Check,
  FileText,
  Database,
  BookOpen,
  Code,
  Languages,
  Video,
  Megaphone,
  Server
} from 'lucide-react'
import { apiKeysApi } from '../api/client'
import { api } from '../api/client'

interface ModelOption {
  model: string
  name: string
  price_per_1m: number
  why: string
}

interface TaskRecommendation {
  task_type: string
  task_description: string
  budget_option: ModelOption
  optimal_option: ModelOption
  premium_option: ModelOption
}

interface StackRecommendation {
  detected_tasks: string[]
  recommendations: TaskRecommendation[]
  estimated_cost: {
    budget: number
    optimal: number
    premium: number
  }
  workflow: string[]
  is_template_match: boolean
  template_name?: string
}

const TEMPLATES = [
  { key: 'content_factory', name: 'Контент-фабрика', icon: FileText, desc: 'Статьи, блог, SEO' },
  { key: 'data_parsing', name: 'Парсинг данных', icon: Database, desc: 'Сбор данных, боты' },
  { key: 'pdf_analysis', name: 'Анализ PDF', icon: BookOpen, desc: 'Документы, отчёты' },
  { key: 'code_review', name: 'Код-ревью', icon: Code, desc: 'Анализ и оптимизация' },
  { key: 'translation', name: 'Переводы', icon: Languages, desc: 'Локализация' },
  { key: 'video_content', name: 'Сценарии видео', icon: Video, desc: 'YouTube, TikTok' },
  { key: 'marketing_copy', name: 'Маркетинг', icon: Megaphone, desc: 'Продающие тексты' },
  { key: 'database', name: 'Базы данных', icon: Server, desc: 'SQL, миграции' },
]

export default function ModelAdvisor() {
  const [isOpen, setIsOpen] = useState(false)
  const [userTask, setUserTask] = useState('')
  const [selectedTier, setSelectedTier] = useState<'budget' | 'optimal' | 'premium'>('optimal')
  const [copiedModels, setCopiedModels] = useState<Set<string>>(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const analyzeMutation = useMutation({
    mutationFn: async (task: string): Promise<StackRecommendation> => {
      const response = await api.post('/advisor/analyze-task', { task })
      return response.data
    }
  })

  const createKeysMutation = useMutation({
    mutationFn: async (models: string[]) => {
      const created = []
      for (const model of models) {
        const res = await apiKeysApi.createApiKey(`Auto: ${model}`, model)
        created.push(res.data)
      }
      return created
    }
  })

  const handleTemplateClick = (templateKey: string) => {
    setSelectedTemplate(templateKey)
    // Templates have predefined descriptions, use them
    const templateDescriptions: Record<string, string> = {
      content_factory: 'Создаю контент-фабрику: статьи для блога, SEO-оптимизация, автоматизация публикаций',
      data_parsing: 'Нужно парсить данные с сайтов: Python-скрипты, боты, автоматизация сбора',
      pdf_analysis: 'Анализирую PDF-документы и отчёты конкурентов, большие документы до 500 страниц',
      code_review: 'Провожу код-ревью: оптимизация, поиск багов, рефакторинг',
      translation: 'Перевожу тексты: локализация сайта, маркетинговые материалы',
      video_content: 'Создаю видео-контент: сценарии для YouTube, TikTok, Reels',
      marketing_copy: 'Маркетинг и копирайтинг: продающие тексты, реклама, email-рассылки',
      database: 'Работаю с базами данных: SQL-запросы, оптимизация, миграции'
    }
    setUserTask(templateDescriptions[templateKey] || '')
    analyzeMutation.mutate(templateDescriptions[templateKey] || '')
  }

  const handleAnalyze = () => {
    if (userTask.trim().length < 10) return
    analyzeMutation.mutate(userTask)
  }

  const copyModelId = (modelId: string) => {
    navigator.clipboard.writeText(modelId)
    setCopiedModels(prev => new Set(prev).add(modelId))
    setTimeout(() => {
      setCopiedModels(prev => {
        const next = new Set(prev)
        next.delete(modelId)
        return next
      })
    }, 2000)
  }

  const getSelectedModels = () => {
    if (!analyzeMutation.data) return []
    return analyzeMutation.data.recommendations.map(r => {
      if (selectedTier === 'budget') return r.budget_option.model
      if (selectedTier === 'premium') return r.premium_option.model
      return r.optimal_option.model
    })
  }

  const getTierIcon = () => {
    switch (selectedTier) {
      case 'budget': return <DollarSign className="w-5 h-5 text-green-600" />
      case 'optimal': return <Zap className="w-5 h-5 text-blue-600" />
      case 'premium': return <Crown className="w-5 h-5 text-purple-600" />
    }
  }

  const getTierName = () => {
    switch (selectedTier) {
      case 'budget': return 'Бюджетный'
      case 'optimal': return 'Оптимальный'
      case 'premium': return 'Премиум'
    }
  }

  const reset = () => {
    setUserTask('')
    setSelectedTemplate(null)
    analyzeMutation.reset()
    createKeysMutation.reset()
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
      >
        <Sparkles className="w-5 h-5" />
        <span>Подобрать стек моделей</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Помощник выбора моделей</h2>
                  <p className="text-sm text-gray-500">Выберите шаблон или опишите задачу</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Templates Grid */}
              {!analyzeMutation.data && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Популярные сценарии:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {TEMPLATES.map((template) => {
                        const Icon = template.icon
                        return (
                          <button
                            key={template.key}
                            onClick={() => handleTemplateClick(template.key)}
                            className={`p-4 rounded-xl border transition-all text-left ${
                              selectedTemplate === template.key
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                            }`}
                          >
                            <Icon className="w-6 h-6 text-blue-600 mb-2" />
                            <p className="font-medium text-gray-900 text-sm">{template.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{template.desc}</p>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-white text-sm text-gray-500">или</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Опишите вашу задачу
                      </label>
                      <textarea
                        value={userTask}
                        onChange={(e) => setUserTask(e.target.value)}
                        placeholder="Например: Нужно анализировать отчёты конкурентов из PDF и писать статьи на основе данных"
                        className="w-full h-24 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        maxLength={500}
                      />
                      <div className="mt-2 text-sm text-gray-500 text-right">
                        {userTask.length}/500
                      </div>
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={userTask.trim().length < 10 || analyzeMutation.isPending}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {analyzeMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Анализирую задачу...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Подобрать стек моделей
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Results */}
              {analyzeMutation.data && (
                <div className="space-y-6">
                  {/* Match Info */}
                  {analyzeMutation.data.is_template_match && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Найден готовый шаблон</p>
                        <p className="text-sm text-green-700">{analyzeMutation.data.template_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Detected Tasks */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">Обнаруженные задачи:</p>
                    <div className="flex flex-wrap gap-2">
                      {analyzeMutation.data.detected_tasks.map((task, i) => (
                        <span key={i} className="px-3 py-1 bg-white text-blue-700 rounded-full text-sm">
                          {task}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tier Selector */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTierIcon()}
                      <span className="font-medium text-gray-900">{getTierName()} стек</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedTier('budget')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTier === 'budget'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        💰 Бюджет
                      </button>
                      <button
                        onClick={() => setSelectedTier('optimal')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTier === 'optimal'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        ⚡ Оптимум
                      </button>
                      <button
                        onClick={() => setSelectedTier('premium')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTier === 'premium'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        👑 Премиум
                      </button>
                    </div>
                  </div>

                  {/* Model Cards */}
                  <div className="space-y-4">
                    {analyzeMutation.data.recommendations.map((rec, i) => {
                      const option = selectedTier === 'budget' ? rec.budget_option : 
                                    selectedTier === 'premium' ? rec.premium_option : 
                                    rec.optimal_option
                      
                      return (
                        <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-500 uppercase">{rec.task_type}</p>
                              <p className="text-gray-700">{rec.task_description}</p>
                            </div>
                            <button
                              onClick={() => copyModelId(option.model)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              {copiedModels.has(option.model) ? (
                                <Check className="w-5 h-5 text-green-600" />
                              ) : (
                                <Copy className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900">{option.name}</span>
                              <span className="text-sm text-gray-600">${option.price_per_1m}/M tokens</span>
                            </div>
                            <p className="text-sm text-gray-600">{option.why}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Cost Summary */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                    <p className="font-medium text-gray-900 mb-2">Примерная стоимость одного цикла:</p>
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-bold ${
                        selectedTier === 'budget' ? 'text-green-600' :
                        selectedTier === 'premium' ? 'text-purple-600' : 'text-blue-600'
                      }`}>
                        ${analyzeMutation.data.estimated_cost[selectedTier].toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {selectedTier === 'budget' ? 'Экономия 70% vs использование одной дорогой модели' :
                         selectedTier === 'premium' ? 'Максимальное качество для критически важных задач' :
                         'Оптимальный баланс цены и качества'}
                      </span>
                    </div>
                  </div>

                  {/* Workflow */}
                  <div className="border border-gray-200 rounded-xl p-4">
                    <p className="font-medium text-gray-900 mb-3">💡 Рекомендуемый workflow:</p>
                    <ol className="space-y-2">
                      {analyzeMutation.data.workflow.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </span>
                          <span className="text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                      Новый запрос
                    </button>
                    <button
                      onClick={() => createKeysMutation.mutate(getSelectedModels())}
                      disabled={createKeysMutation.isPending}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {createKeysMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Создаю ключи...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Создать API ключи ({getSelectedModels().length})
                        </>
                      )}
                    </button>
                  </div>

                  {createKeysMutation.data && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-green-800 font-medium flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Создано {createKeysMutation.data.length} API ключей!
                      </p>
                      <p className="text-green-600 text-sm mt-1">
                        Перейдите в раздел API Keys чтобы скопировать их
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
