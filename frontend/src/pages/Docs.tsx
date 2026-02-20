import { useState } from 'react'
import { useTranslation } from '../i18n'
import { 
  Book, 
  Code, 
  Terminal, 
  Settings, 
  HelpCircle, 
  ChevronRight,
  Copy,
  Check
} from 'lucide-react'

const CODE_EXAMPLES = {
  curl: `curl https://airouter.host/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,

  python: `import requests

response = requests.post(
    "https://airouter.host/v1/chat/completions",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "model": "openai/gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}]
    }
)

print(response.json()["choices"][0]["message"]["content"])`,

  javascript: `const response = await fetch('https://airouter.host/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`,

  php: `<?php
$ch = curl_init('https://airouter.host/v1/chat/completions');

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer YOUR_API_KEY',
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'openai/gpt-4o',
    'messages' => [['role' => 'user', 'content' => 'Hello!']]
]));

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo $data['choices'][0]['message']['content'];`
}

const N8N_CONFIG = `{
  "nodes": [
    {
      "parameters": {
        "method": "POST",
        "url": "https://airouter.host/v1/chat/completions",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "contentType": "json",
        "body": {
          "model": "openai/gpt-4o",
          "messages": [
            {
              "role": "system",
              "content": "You are a helpful assistant"
            },
            {
              "role": "user",
              "content": "={{ $json.message }}"
            }
          ]
        },
        "options": {}
      },
      "name": "AI Router",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [250, 300]
    }
  ]
}`

const getSections = (t: any) => [
  { id: 'quickstart', title: t('docs.quickstart'), icon: Terminal },
  { id: 'n8n', title: 'n8n', icon: Settings },
  { id: 'make', title: 'Make.com', icon: Settings },
  { id: 'zapier', title: 'Zapier', icon: Settings },
  { id: 'code', title: t('docs.codeExamples'), icon: Code },
  { id: 'advanced', title: t('docs.advanced'), icon: Book },
  { id: 'faq', title: 'FAQ', icon: HelpCircle },
]

export default function Docs() {
  const { t, language } = useTranslation()
  const [activeSection, setActiveSection] = useState('quickstart')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedLang, setSelectedLang] = useState<'curl' | 'python' | 'javascript' | 'php'>('curl')
  
  const SECTIONS = getSections(t)

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const CodeBlock = ({ code, id }: { code: string; id: string }) => (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-[20px] overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-500 hover:text-white transition-colors"
      >
        {copiedCode === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'quickstart':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('docs.quickstart')}</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-4">
              <h3 className="font-semibold text-blue-900 mb-2">{t('docs.baseUrl')}</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Base URL:</strong> <code className="bg-blue-100 px-2 py-1 rounded">https://airouter.host/v1</code></p>
                <p><strong>{t('docs.authorization')}:</strong> <code className="bg-blue-100 px-2 py-1 rounded">Bearer YOUR_API_KEY</code></p>
                <p><strong>Content-Type:</strong> <code className="bg-blue-100 px-2 py-1 rounded">application/json</code></p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('docs.getApiKey')}</h3>
              <p className="text-gray-600 mb-4">
                {language === 'ru' 
                  ? 'Перейдите в раздел API Keys в вашем дашборде и создайте новый ключ. Скопируйте его — он понадобится для всех запросов.'
                  : 'Go to API Keys section in your dashboard and create a new key. Copy it — you will need it for all requests.'}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('docs.firstRequest')}</h3>
              <CodeBlock code={CODE_EXAMPLES.curl} id="curl-basic" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">{t('docs.parameters')}</h3>
              <div className="bg-gray-50 rounded-[20px] p-4 space-y-3">
                <div>
                  <code className="font-semibold text-blue-600">model</code>
                  <p className="text-sm text-gray-600">
                    {language === 'ru' 
                      ? 'ID модели (например: openai/gpt-4o, anthropic/claude-3-5-sonnet)'
                      : 'Model ID (e.g.: openai/gpt-4o, anthropic/claude-3-5-sonnet)'}
                  </p>
                </div>
                <div>
                  <code className="font-semibold text-blue-600">messages</code>
                  <p className="text-sm text-gray-600">
                    {language === 'ru'
                      ? 'Массив сообщений с role (system/user/assistant) и content'
                      : 'Array of messages with role (system/user/assistant) and content'}
                  </p>
                </div>
                <div>
                  <code className="font-semibold text-blue-600">max_tokens</code>
                  <p className="text-sm text-gray-600">
                    {language === 'ru'
                      ? 'Максимальное количество токенов в ответе (опционально)'
                      : 'Maximum number of tokens in response (optional)'}
                  </p>
                </div>
                <div>
                  <code className="font-semibold text-blue-600">temperature</code>
                  <p className="text-sm text-gray-600">
                    {language === 'ru'
                      ? 'Креативность от 0 до 2 (0 = детерминировано, 2 = максимально креативно)'
                      : 'Creativity from 0 to 2 (0 = deterministic, 2 = maximum creative)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'n8n':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">n8n {language === 'ru' ? 'Интеграция' : 'Integration'}</h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-[20px] p-4">
                <h3 className="font-semibold text-green-900 mb-2">{t('docs.n8nTemplate')}</h3>
                <p className="text-sm text-green-800 mb-3">
                  {language === 'ru'
                    ? 'Скопируйте JSON ниже и импортируйте в n8n (Workflow → Import from JSON)'
                    : 'Copy JSON below and import into n8n (Workflow → Import from JSON)'}
                </p>
                <CodeBlock code={N8N_CONFIG} id="n8n-template" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">{t('docs.n8nManual')}</h3>
                <ol className="space-y-4 list-decimal list-inside">
                  <li className="text-gray-700">
                    <strong>Добавьте HTTP Request node</strong>
                    <p className="text-sm text-gray-600 ml-6 mt-1">Method: POST, URL: https://airouter.host/v1/chat/completions</p>
                  </li>
                  <li className="text-gray-700">
                    <strong>Настройте Authentication</strong>
                    <p className="text-sm text-gray-600 ml-6 mt-1">Generic Auth Type → HTTP Header Auth → Name: Authorization, Value: Bearer YOUR_API_KEY</p>
                  </li>
                  <li className="text-gray-700">
                    <strong>Укажите Body</strong>
                    <div className="ml-6 mt-2">
                      <CodeBlock code={`{
  "model": "openai/gpt-4o",
  "messages": [
    {"role": "user", "content": "{{ $json.message }}"}
  ]
}`} id="n8n-body" />
                    </div>
                  </li>
                  <li className="text-gray-700">
                    <strong>Обработайте ответ</strong>
                    <p className="text-sm text-gray-600 ml-6 mt-1">Ответ находится в: <code>choices[0].message.content</code></p>
                  </li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-[20px] p-4">
                <h3 className="font-semibold text-yellow-900 mb-2">💡 Совет</h3>
                <p className="text-sm text-gray-700">
                  Сохраните API ключ в Credentials n8n, чтобы не вставлять его в каждый workflow.
                </p>
              </div>
            </div>
          </div>
        )

      case 'make':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Интеграция с Make.com</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Пошаговая настройка</h3>
                <ol className="space-y-4 list-decimal list-inside">
                  <li className="text-gray-700">
                    <strong>Добавьте модуль HTTP → Make a request</strong>
                  </li>
                  <li className="text-gray-700">
                    <strong>Настройте параметры</strong>
                    <div className="bg-gray-50 rounded-[20px] p-4 mt-2 ml-6 space-y-2 text-sm">
                      <p><strong>URL:</strong> https://airouter.host/v1/chat/completions</p>
                      <p><strong>Method:</strong> POST</p>
                      <p><strong>Headers:</strong></p>
                      <ul className="ml-4 list-disc">
                        <li>Authorization: Bearer YOUR_API_KEY</li>
                        <li>Content-Type: application/json</li>
                      </ul>
                      <p><strong>Body type:</strong> Raw</p>
                      <p><strong>Content type:</strong> JSON (application/json)</p>
                    </div>
                  </li>
                  <li className="text-gray-700">
                    <strong>Request content:</strong>
                    <div className="ml-6 mt-2">
                      <CodeBlock code={`{
  "model": "openai/gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "{{1.message}}"}
  ]
}`} id="make-body" />
                    </div>
                  </li>
                  <li className="text-gray-700">
                    <strong>Парсинг ответа</strong>
                    <p className="text-sm text-gray-600 ml-6 mt-1">
                      Добавьте модуль JSON → Parse JSON после HTTP.
                      Data structure: <code>choices[0].message.content</code>
                    </p>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )

      case 'zapier':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Интеграция с Zapier</h2>
            
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-[20px] p-4">
                <p className="text-orange-800">
                  <strong>Важно:</strong> Zapier не имеет нативной интеграции с OpenRouter-совместимыми API.
                  Используйте Webhooks или Code by Zapier.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Вариант 1: Webhooks by Zapier</h3>
                <ol className="space-y-3 list-decimal list-inside text-gray-700">
                  <li>Выберите <strong>Webhooks by Zapier</strong> → <strong>Custom Request</strong></li>
                  <li>Method: <strong>POST</strong></li>
                  <li>URL: <code>https://airouter.host/v1/chat/completions</code></li>
                  <li>Data Pass-Through? <strong>No</strong></li>
                  <li>Data:</li>
                </ol>
                <div className="mt-2">
                  <CodeBlock code={`model=openai/gpt-4o&messages=[{"role":"user","content":"Hello"}]`} id="zapier-webhook" />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Headers добавьте в поле <strong>Headers</strong>:
                </p>
                <ul className="text-sm text-gray-600 ml-6 list-disc">
                  <li>Authorization: Bearer YOUR_API_KEY</li>
                  <li>Content-Type: application/json</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Вариант 2: Code by Zapier (Python)</h3>
                <CodeBlock code={`import requests

url = 'https://airouter.host/v1/chat/completions'
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
}
data = {
    'model': 'openai/gpt-4o',
    'messages': [{'role': 'user', 'content': input_data['message']}]
}

response = requests.post(url, headers=headers, json=data)
output = {'reply': response.json()['choices'][0]['message']['content']}`} id="zapier-code" />
              </div>
            </div>
          </div>
        )

      case 'code':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">{t('docs.codeExamples')}</h2>
            
            <div className="flex gap-2 mb-4">
              {(['curl', 'python', 'javascript', 'php'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedLang === lang
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <CodeBlock code={CODE_EXAMPLES[selectedLang]} id={`code-${selectedLang}`} />

            <div className="bg-gray-50 rounded-[20px] p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.openaiSdk')}</h3>
              <p className="text-sm text-gray-600 mb-3">
                {language === 'ru'
                  ? 'Можете использовать официальный SDK OpenAI, просто изменив base_url:'
                  : 'You can use the official OpenAI SDK, just change the base_url:'}
              </p>
              <CodeBlock code={`from openai import OpenAI

client = OpenAI(
    api_key="YOUR_API_KEY",
    base_url="https://airouter.host/v1"
)

response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)`} id="openai-sdk" />
            </div>
          </div>
        )

      case 'advanced':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Продвинутое использование</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Streaming (SSE)</h3>
                <p className="text-gray-600 mb-3">
                  Для получения ответа частями (как ChatGPT), добавьте <code>stream: true</code>:
                </p>
                <CodeBlock code={`curl https://airouter.host/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`} id="streaming" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Vision (Анализ изображений)</h3>
                <CodeBlock code={`{
  "model": "openai/gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "Опиши это изображение:"},
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/image.jpg"
          }
        }
      ]
    }
  ]
}`} id="vision" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Function Calling</h3>
                <p className="text-gray-600 mb-3">
                  Модель может вызывать функции для получения данных:
                </p>
                <CodeBlock code={`{
  "model": "openai/gpt-4o",
  "messages": [{"role": "user", "content": "Какая погода в Москве?"}],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get weather for a city",
        "parameters": {
          "type": "object",
          "properties": {
            "city": {"type": "string"}
          },
          "required": ["city"]
        }
      }
    }
  ]
}`} id="function-calling" />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-[20px] p-4">
                <h3 className="font-semibold text-red-900 mb-2">Обработка ошибок</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>401</strong> — Неверный API ключ</p>
                  <p><strong>429</strong> — Rate limit exceeded</p>
                  <p><strong>500</strong> — Ошибка сервера или нет доступных мастер-аккаунтов</p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'faq':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Частые вопросы</h2>
            
            <div className="space-y-4">
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Какие модели доступны?</h3>
                <p className="text-gray-600">
                  Все модели OpenRouter: GPT-4o, Claude 3.5 Sonnet, Llama 3.1, и многие другие. 
                  Полный список в разделе <strong>Models</strong> в дашборде.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Есть ли лимиты?</h3>
                <p className="text-gray-600">
                  Лимиты зависят от вашего баланса. Минимальный запрос — $0.001. 
                  Rate limit: 100 запросов/минуту для обычных аккаунтов.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Поддерживается ли streaming?</h3>
                <p className="text-gray-600">
                  Да, добавьте <code>"stream": true</code> в запрос. Ответ будет приходить 
                  частями через Server-Sent Events (SSE).
                </p>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Можно ли использовать OpenAI SDK?</h3>
                <p className="text-gray-600">
                  Да! Просто измените <code>base_url</code> на <code>https://airouter.host/v1</code>.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Как получить поддержку?</h3>
                <p className="text-gray-600">
                  Пишите в Telegram: @maxon3ds или на email: teodor775teodor@gmail.com
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-[20px] shadow-sm p-4 sticky top-8">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Book className="w-4 h-4" />
                {t('docs.title')}
              </h2>
              <nav className="space-y-1">
                {SECTIONS.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {section.title}
                      {activeSection === section.id && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-[20px] shadow-sm p-8">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
