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
  Check
} from 'lucide-react'
import { api, apiKeysApi } from '../api/client'

interface ModelRecommendation {
  taskType: string
  taskDescription: string
  budgetOption: {
    model: string
    name: string
    pricePer1M: number
    why: string
  }
  optimalOption: {
    model: string
    name: string
    pricePer1M: number
    why: string
  }
  premiumOption: {
    model: string
    name: string
    pricePer1M: number
    why: string
  }
}

interface StackRecommendation {
  userTask: string
  detectedTasks: string[]
  recommendations: ModelRecommendation[]
  estimatedCost: {
    budget: number
    optimal: number
    premium: number
  }
  workflow: string[]
}

export default function ModelAdvisor() {
  const [isOpen, setIsOpen] = useState(false)
  const [userTask, setUserTask] = useState('')
  const [selectedTier, setSelectedTier] = useState<'budget' | 'optimal' | 'premium'>('optimal')
  const [copiedModels, setCopiedModels] = useState<Set<string>>(new Set())

  const analyzeMutation = useMutation({
    mutationFn: async (task: string) => {
      // Use GPT-4o-mini to analyze the task and recommend models
      const response = await api.post('/chat/completions', {
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI model selection expert. Analyze the user's task and recommend the best stack of AI models.
            
Identify all sub-tasks and types of generation needed (text, code, analysis, creative, long-context, etc.).

For each sub-task, recommend THREE options:
1. Budget - cheapest option that still works
2. Optimal - best price/quality balance
3. Premium - highest quality regardless of price

Available models and their strengths:
- gpt-4o-mini: Cheap, fast, good for drafts, code, simple tasks ($0.15/M tokens)
- gpt-4o: High quality, good for final texts, complex code, analysis ($2.50/M tokens)
- claude-3-5-sonnet: Best for long context (200K), creative writing, analysis ($3.00/M tokens)
- claude-3-opus: Premium quality, very long context, complex reasoning ($15.00/M tokens)
- gpt-4-turbo: Good balance, large context (128K) ($10.00/M tokens)

Respond in JSON format:
{
  "detectedTasks": ["task1", "task2"],
  "recommendations": [
    {
      "taskType": "text generation",
      "taskDescription": "Writing blog posts",
      "budgetOption": {"model": "gpt-4o-mini", "name": "GPT-4o Mini", "pricePer1M": 0.15, "why": "Great for drafts and fast iteration"},
      "optimalOption": {"model": "gpt-4o", "name": "GPT-4o", "pricePer1M": 2.50, "why": "Best quality for published content"},
      "premiumOption": {"model": "claude-3-5-sonnet", "name": "Claude 3.5", "pricePer1M": 3.00, "why": "Superior writing style and creativity"}
    }
  ],
  "estimatedCost": {"budget": 0.45, "optimal": 7.50, "premium": 18.00},
  "workflow": ["Step 1: Use Model A for...", "Step 2: Use Model B for..."]
}`
          },
          {
            role: 'user',
            content: task
          }
        ],
        max_tokens: 2000
      })
      
      const content = response.data.choices[0].message.content
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as StackRecommendation
      }
      throw new Error('Failed to parse recommendation')
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
      if (selectedTier === 'budget') return r.budgetOption.model
      if (selectedTier === 'premium') return r.premiumOption.model
      return r.optimalOption.model
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
                  <p className="text-sm text-gray-500">Опишите вашу задачу — мы подберём оптимальный стек</p>
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
              {/* Input Section */}
              {!analyzeMutation.data && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Опишите вашу задачу
                    </label>
                    <textarea
                      value={userTask}
                      onChange={(e) => setUserTask(e.target.value)}
                      placeholder="Например: Создаю контент-фабрику. Нужно писать статьи для блога, делать Python-скрипты для парсинга и анализировать PDF-отчёты конкурентов"
                      className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
              )}

              {/* Results */}
              {analyzeMutation.data && (
                <div className="space-y-6">
                  {/* Detected Tasks */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">Обнаруженные задачи:</p>
                    <div className="flex flex-wrap gap-2">
                      {analyzeMutation.data.detectedTasks.map((task, i) => (
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
                      const option = selectedTier === 'budget' ? rec.budgetOption : 
                                    selectedTier === 'premium' ? rec.premiumOption : 
                                    rec.optimalOption
                      
                      return (
                        <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-500 uppercase">{rec.taskType}</p>
                              <p className="text-gray-700">{rec.taskDescription}</p>
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
                              <span className="text-sm text-gray-600">${option.pricePer1M}/M tokens</span>
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
                        ${analyzeMutation.data.estimatedCost[selectedTier].toFixed(2)}
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
                      onClick={() => {
                        setUserTask('')
                        analyzeMutation.reset()
                      }}
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
