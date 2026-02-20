import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../i18n'
import { 
  Brain, 
  Sparkles, 
  X, 
  Loader2, 
  CheckCircle,
  Copy,
  Check,
  Layers,
  Key,
  AlertTriangle
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

interface CreatedApiKey {
  id: string
  name: string
  key: string
  allowed_model: string | null
}

export default function ModelAdvisor() {
  const { t, language } = useTranslation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [userTask, setUserTask] = useState('')
  const [copiedModels, setCopiedModels] = useState<Set<string>>(new Set())
  const [showKeysModal, setShowKeysModal] = useState(false)
  const [createdKeys, setCreatedKeys] = useState<CreatedApiKey[]>([])
  const [copiedAll, setCopiedAll] = useState(false)

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
    },
    onSuccess: (data) => {
      setCreatedKeys(data)
      setShowKeysModal(true)
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

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
  }

  const copyAllKeys = () => {
    const allKeys = createdKeys.map(k => `${k.name}: ${k.key}`).join('\n')
    navigator.clipboard.writeText(allKeys)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  const handleCloseKeysModal = () => {
    setShowKeysModal(false)
    setIsOpen(false)
    reset()
    // Редирект на /api-keys
    navigate('/api-keys')
  }

  const reset = () => {
    setUserTask('')
    analyzeMutation.reset()
    createKeysMutation.reset()
    setCreatedKeys([])
    setShowKeysModal(false)
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
      >
        <Sparkles className="w-5 h-5" />
        <span>{t('modelAdvisor.button')}</span>
      </button>

      {/* Main Modal */}
      {isOpen && !showKeysModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" key={language}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Brain className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{t('modelAdvisor.title')}</h2>
                  <p className="text-sm text-gray-600">{t('modelAdvisor.subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Input Section */}
              {!analyzeMutation.data && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('modelAdvisor.describeTask')}
                    </label>
                    <textarea
                      value={userTask}
                      onChange={(e) => setUserTask(e.target.value)}
                      placeholder={t('modelAdvisor.placeholder')}
                      className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      maxLength={500}
                    />
                    <div className="mt-2 text-sm text-gray-600 text-right">
                      {userTask.length}/500
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('modelAdvisor.examples')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <button
                        onClick={() => setUserTask(t('modelAdvisor.exampleVideoTask'))}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {t('modelAdvisor.exampleVideo')}
                      </button>
                      <button
                        onClick={() => setUserTask(t('modelAdvisor.exampleOcrTask'))}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {t('modelAdvisor.exampleOcr')}
                      </button>
                      <button
                        onClick={() => setUserTask(t('modelAdvisor.exampleImageTask'))}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {t('modelAdvisor.exampleImage')}
                      </button>
                      <button
                        onClick={() => setUserTask(t('modelAdvisor.exampleScienceTask'))}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {t('modelAdvisor.exampleScience')}
                      </button>
                      <button
                        onClick={() => setUserTask(t('modelAdvisor.exampleContentTask'))}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {t('modelAdvisor.exampleContent')}
                      </button>
                      <button
                        onClick={() => setUserTask(t('modelAdvisor.exampleCodeTask'))}
                        className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {t('modelAdvisor.exampleCode')}
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
                        {t('modelAdvisor.analyzing')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        {t('modelAdvisor.selectStack')}
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
                    <h3 className="font-semibold text-gray-900">{t('modelAdvisor.recommendedStack')}</h3>
                  </div>
                  <p className="text-xs text-gray-600 -mt-4">{t('modelAdvisor.descriptionLang')}</p>

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
                              <p className="text-sm text-gray-600">{rec.task}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyModelId(rec.model)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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

                  {/* Workflow */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4">
                    <p className="font-medium text-gray-900 mb-3">{t('modelAdvisor.stepByStepPlan')}</p>
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
                      {t('modelAdvisor.newRequest')}
                    </button>
                    <button
                      onClick={() => createKeysMutation.mutate(analyzeMutation.data!.recommendations.map(r => r.model))}
                      disabled={createKeysMutation.isPending}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {createKeysMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {language === 'ru' ? 'Создаю ключи...' : 'Creating keys...'}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          {t('modelAdvisor.createKeys')} ({analyzeMutation.data.recommendations.length})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keys Modal - показывается после создания ключей */}
      {showKeysModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]" key={`keys-${language}`}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Key className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-green-900">{t('modelAdvisor.keysCreated')}</h2>
                  <p className="text-sm text-green-700">{t('modelAdvisor.saveNow')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">{t('modelAdvisor.important')}</p>
                  <p className="text-sm text-yellow-800">
                    {t('modelAdvisor.keysWarning')}
                  </p>
                </div>
              </div>

              {/* Keys List */}
              <div className="space-y-3">
                {createdKeys.map((key, i) => (
                  <div key={key.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </span>
                        <span className="font-medium text-gray-900">{key.name}</span>
                      </div>
                      <button
                        onClick={() => copyKey(key.key)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title={t('modelAdvisor.copyKey')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <code className="block bg-gray-900 text-green-400 px-3 py-2 rounded-lg text-sm font-mono break-all">
                      {key.key}
                    </code>
                    {key.allowed_model && (
                      <p className="text-xs text-gray-600 mt-2">{t('modelAdvisor.model')}: {key.allowed_model}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Copy All Button */}
              <button
                onClick={copyAllKeys}
                className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-5 h-5" />
                    {t('modelAdvisor.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    {t('modelAdvisor.copyAllKeys')}
                  </>
                )}
              </button>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCloseKeysModal}
                  className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                  {t('modelAdvisor.goToApiKeys')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
