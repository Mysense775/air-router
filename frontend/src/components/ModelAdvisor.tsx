import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { 
  Brain, 
  Sparkles, 
  X, 
  Loader2, 
  CheckCircle,
  Copy,
  Check,
  Layers
} from 'lucide-react'
import { apiKeysApi } from '../api/client'
import { api } from '../api/client'

interface ModelRecommendation {
  model: string
  name: string
  task: string
  why: string
}

interface StackRecommendation {
  recommendations: ModelRecommendation[]
  workflow: string[]
}

export default function ModelAdvisor() {
  const [isOpen, setIsOpen] = useState(false)
  const [userTask, setUserTask] = useState('')
  const [copiedModels, setCopiedModels] = useState<Set<string>>(new Set())

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

  const reset = () => {
    setUserTask('')
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
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Помощник выбора моделей</h2>
                  <p className="text-sm text-gray-500">AI подберёт оптимальный стек для вашей задачи</p>
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

                  {/* Examples */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Примеры запросов:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <button
                        onClick={() => setUserTask('Создаю видеоконтент: генерация роликов для YouTube, TikTok, Reels с синхронизированным звуком')}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        🎬 Видеогенерация: YouTube, TikTok, Reels
                      </button>
                      <button
                        onClick={() => setUserTask('OCR и обработка документов: сканирование инвойсов, извлечение таблиц из PDF, структурирование данных')}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        📄 OCR: инвойсы, таблицы, PDF
                      </button>
                      <button
                        onClick={() => setUserTask('Генерация изображений: логотипы с текстом, маркетинговые баннеры, иллюстрации для соцсетей')}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        🎨 Изображения: логотипы, баннеры
                      </button>
                      <button
                        onClick={() => setUserTask('Научные исследования: анализ статей, математические доказательства, длинные контексты до 10M токенов')}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        🔬 Наука: статьи, математика, анализ
                      </button>
                      <button
                        onClick={() => setUserTask('Контент-фабрика: статьи для блога, SEO-оптимизация, автоматизация публикаций')}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        ✍️ Контент: статьи, SEO, автоматизация
                      </button>
                      <button
                        onClick={() => setUserTask('Парсинг данных: Python-скрипты, боты, автоматизация сбора данных')}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        💻 Код: парсинг, скрипты, боты
                      </button>
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
                        AI анализирует задачу...
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
                  {/* Recommended Stack Header */}
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Рекомендуемый стек</h3>
                  </div>

                  {/* Model Cards */}
                  <div className="space-y-3">
                    {analyzeMutation.data.recommendations.map((rec, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm font-medium">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-gray-900">{rec.name}</p>
                              <p className="text-sm text-gray-500">{rec.task}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyModelId(rec.model)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            {copiedModels.has(rec.model) ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <Copy className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 ml-11">{rec.why}</p>
                      </div>
                    ))}
                  </div>

                  {/* Workflow / Recommended Stack Steps */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                    <p className="font-medium text-gray-900 mb-3">📋 Пошаговый план:</p>
                    <ol className="space-y-2">
                      {analyzeMutation.data.workflow.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-white text-blue-600 rounded-full flex items-center justify-center text-sm font-medium shadow-sm">
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
                      onClick={() => createKeysMutation.mutate(analyzeMutation.data!.recommendations.map(r => r.model))}
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
                          Создать ключи для стека ({analyzeMutation.data.recommendations.length})
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
