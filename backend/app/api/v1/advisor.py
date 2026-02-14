from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import json

from app.db.session import get_db
from app.api.v1.auth import get_current_active_user
from app.models import User

router = APIRouter()

class TaskAnalysisRequest(BaseModel):
    task: str

class ModelOption(BaseModel):
    model: str
    name: str
    price_per_1m: float
    why: str

class TaskRecommendation(BaseModel):
    task_type: str
    task_description: str
    budget_option: ModelOption
    optimal_option: ModelOption
    premium_option: ModelOption

class TaskAnalysisResponse(BaseModel):
    detected_tasks: list[str]
    recommendations: list[TaskRecommendation]
    estimated_cost: dict[str, float]
    workflow: list[str]
    is_template_match: bool = False
    template_name: str | None = None

# Предустановленные шаблоны
TASK_TEMPLATES = {
    "content_factory": {
        "name": "Контент-фабрика",
        "keywords": ["контент", "фабрика", "блог", "статьи", "много текстов"],
        "detected_tasks": ["Генерация текстов", "SEO-оптимизация", "Автоматизация публикаций"],
        "recommendations": [
            {
                "task_type": "Черновики статей",
                "task_description": "Быстрая генерация идей и черновиков",
                "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Дёшево и быстро для черновиков"},
                "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Отличное качество для публикаций"},
                "premium_option": {"model": "anthropic/claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "price_per_1m": 3.00, "why": "Лучший стиль и креативность"}
            },
            {
                "task_type": "SEO и метаданные",
                "task_description": "Заголовки, описания, теги",
                "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Мета-теги не требуют высокого качества"},
                "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Хороший баланс для SEO"},
                "premium_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Для критически важных страниц"}
            }
        ],
        "estimated_cost": {"budget": 0.30, "optimal": 5.00, "premium": 6.00},
        "workflow": [
            "GPT-4o Mini генерирует 10 вариантов черновиков",
            "GPT-4o дорабатывает лучший вариант до финала",
            "Claude 3.5 делает финальную редактуру (опционально)",
            "GPT-4o Mini создаёт SEO-метаданные"
        ]
    },
    
    "data_parsing": {
        "name": "Парсинг и автоматизация",
        "keywords": ["парсинг", "скрапинг", "автоматизация", "сбор данных", "бот"],
        "detected_tasks": ["Написание скриптов", "Обработка данных", "Автоматизация"],
        "recommendations": [
            {
                "task_type": "Python-скрипты",
                "task_description": "Парсеры, боты, автоматизация",
                "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Простые скрипты и прототипы"},
                "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Надёжный код с обработкой ошибок"},
                "premium_option": {"model": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "price_per_1m": 15.00, "why": "Сложная архитектура и алгоритмы"}
            }
        ],
        "estimated_cost": {"budget": 0.20, "optimal": 3.00, "premium": 18.00},
        "workflow": [
            "Опишите сайт/данные для парсинга",
            "GPT-4o создаёт полноценный скрипт",
            "Тестируйте и запрашивайте доработки",
            "Для сложных случаев используйте Claude 3 Opus"
        ]
    },
    
    "pdf_analysis": {
        "name": "Анализ документов PDF",
        "keywords": ["pdf", "документы", "анализ", "отчёты", "книги", "100+ страниц"],
        "detected_tasks": ["Обработка PDF", "Извлечение данных", "Анализ документов"],
        "recommendations": [
            {
                "task_type": "Длинные документы",
                "task_description": "PDF, отчёты, книги до 500 страниц",
                "budget_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "128K контекста для средних документов"},
                "optimal_option": {"model": "anthropic/claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "price_per_1m": 3.00, "why": "200K контекста, лучший анализ"},
                "premium_option": {"model": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "price_per_1m": 15.00, "why": "Максимальное качество анализа"}
            }
        ],
        "estimated_cost": {"budget": 5.00, "optimal": 8.00, "premium": 40.00},
        "workflow": [
            "Загрузите PDF (если интеграция есть)",
            "Claude 3.5 Sonnet анализирует документ целиком",
            "Задавайте вопросы по содержанию",
            "Создавайте summary и выжимки"
        ]
    },
    
    "code_review": {
        "name": "Код-ревью и рефакторинг",
        "keywords": ["код-ревью", "рефакторинг", "оптимизация", "ревью", "исправить код"],
        "detected_tasks": ["Анализ кода", "Оптимизация", "Поиск багов"],
        "recommendations": [
            {
                "task_type": "Анализ и ревью кода",
                "task_description": "Проверка качества, поиск багов, оптимизация",
                "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Быстрая проверка очевидных проблем"},
                "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Глубокий анализ с объяснениями"},
                "premium_option": {"model": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "price_per_1m": 15.00, "why": "Сложные архитектурные решения"}
            }
        ],
        "estimated_cost": {"budget": 0.30, "optimal": 5.00, "premium": 30.00},
        "workflow": [
            "Отправьте код для анализа",
            "GPT-4o найдёт проблемы и предложит решения",
            "Claude 3 Opus для сложной архитектуры"
        ]
    },
    
    "translation": {
        "name": "Переводы и локализация",
        "keywords": ["перевод", "translation", "локализация", "translate", "english", "russian"],
        "detected_tasks": ["Перевод текстов", "Локализация"],
        "recommendations": [
            {
                "task_type": "Перевод",
                "task_description": "Технические и маркетинговые тексты",
                "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Быстрый перевод для черновиков"},
                "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Точный перевод с контекстом"},
                "premium_option": {"model": "anthropic/claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "price_per_1m": 3.00, "why": "Литературный стиль и нюансы"}
            }
        ],
        "estimated_cost": {"budget": 0.15, "optimal": 2.50, "premium": 3.00},
        "workflow": [
            "Отправьте текст для перевода",
            "GPT-4o делает качественный перевод",
            "Claude 3.5 для литературных текстов"
        ]
    },
    
    "video_content": {
        "name": "Сценарии для видео",
        "keywords": ["видео", "сценарий", "youtube", "тикток", "сценарии", "video script"],
        "detected_tasks": ["Сценарии", "Сценарии для видео", "Контент-план"],
        "recommendations": [
            {
                "task_type": "Сценарии для видео",
                "task_description": "YouTube, TikTok, Reels, корпоративное видео",
                "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Идеи и наброски сценариев"},
                "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Готовые сценарии для съёмки"},
                "premium_option": {"model": "anthropic/claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "price_per_1m": 3.00, "why": "Креативные и вирусные сценарии"}
            }
        ],
        "estimated_cost": {"budget": 0.20, "optimal": 3.50, "premium": 4.50},
        "workflow": [
            "GPT-4o Mini генерирует 10 идей",
            "Выбираете лучшую идею",
            "GPT-4o или Claude пишут полноценный сценарий",
            "⚠️ Видео-генерация не поддерживается, только сценарии"
        ]
    },
    
    "marketing_copy": {
        "name": "Маркетинг и копирайтинг",
        "keywords": ["маркетинг", "продающий текст", "реклама", "копирайтинг", "продажи"],
        "detected_tasks": ["Продающие тексты", "Креатив", "Маркетинг"],
        "recommendations": [
            {
                "task_type": "Продающие тексты",
                "task_description": "Реклама, лендинги, email-рассылки",
                "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Много вариантов для A/B тестов"},
                "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Убедительные тексты для конверсии"},
                "premium_option": {"model": "anthropic/claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "price_per_1m": 3.00, "why": "Вирусные и креативные идеи"}
            }
        ],
        "estimated_cost": {"budget": 0.30, "optimal": 5.00, "premium": 6.00},
        "workflow": [
            "GPT-4o Mini генерирует 20 вариантов заголовков",
            "GPT-4o пишет полноценный продающий текст",
            "Claude 3.5 добавляет креативный поворот"
        ]
    },
    
    "database": {
        "name": "Базы данных и SQL",
        "keywords": ["sql", "база данных", "database", "postgresql", "mysql", "запросы"],
        "detected_tasks": ["SQL-запросы", "Оптимизация БД", "Миграции"],
        "recommendations": [
            {
                "task_type": "SQL и базы данных",
                "task_description": "Сложные запросы, оптимизация, миграции",
                "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Простые SELECT и INSERT"},
                "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Сложные JOIN, оптимизация"},
                "premium_option": {"model": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "price_per_1m": 15.00, "why": "Архитектура БД, сложные миграции"}
            }
        ],
        "estimated_cost": {"budget": 0.20, "optimal": 3.00, "premium": 20.00},
        "workflow": [
            "Опишите структуру данных",
            "GPT-4o создаёт оптимальные запросы",
            "Claude 3 Opus для архитектурных решений"
        ]
    }
}


@router.post("/analyze-task", response_model=TaskAnalysisResponse)
async def analyze_task(
    request: TaskAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Analyze user task and recommend AI model stack"""
    
    task_lower = request.task.lower()
    
    # Check for template matches
    for template_key, template in TASK_TEMPLATES.items():
        for keyword in template["keywords"]:
            if keyword in task_lower:
                return TaskAnalysisResponse(
                    detected_tasks=template["detected_tasks"],
                    recommendations=template["recommendations"],
                    estimated_cost=template["estimated_cost"],
                    workflow=template["workflow"],
                    is_template_match=True,
                    template_name=template["name"]
                )
    
    # If no template match, use AI analysis
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/v1/proxy/chat/completions",
                headers={"Authorization": f"Bearer {await get_system_api_key(db)}"},
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": """Analyze the user's task and recommend AI models. 
                            
Available models:
- gpt-4o-mini: $0.15/M, fast, good for drafts and simple tasks
- gpt-4o: $2.50/M, high quality, best for most tasks
- claude-3-5-sonnet: $3.00/M, 200K context, creative tasks
- claude-3-opus: $15.00/M, premium, complex reasoning

Respond in JSON format:
{
  "detected_tasks": ["task1", "task2"],
  "recommendations": [
    {
      "task_type": "type",
      "task_description": "description",
      "budget_option": {"model": "...", "name": "...", "price_per_1m": X, "why": "..."},
      "optimal_option": {"model": "...", "name": "...", "price_per_1m": X, "why": "..."},
      "premium_option": {"model": "...", "name": "...", "price_per_1m": X, "why": "..."}
    }
  ],
  "estimated_cost": {"budget": X, "optimal": X, "premium": X},
  "workflow": ["step1", "step2"]
}"""
                        },
                        {"role": "user", "content": request.task}
                    ],
                    "max_tokens": 2000
                },
                timeout=30.0
            )
            
            content = response.json()["choices"][0]["message"]["content"]
            json_match = content.search(r'\{[\s\S]*\}')
            if json_match:
                data = json.loads(json_match.group())
                return TaskAnalysisResponse(**data, is_template_match=False)
    except Exception as e:
        # Fallback to generic recommendation
        pass
    
    # Ultimate fallback
    return TaskAnalysisResponse(
        detected_tasks=["Общие AI-задачи"],
        recommendations=[
            {
                "task_type": "Универсальная задача",
                "task_description": request.task[:100],
                "budget_option": ModelOption(model="openai/gpt-4o-mini", name="GPT-4o Mini", price_per_1m=0.15, why="Быстро и дёшево для тестов"),
                "optimal_option": ModelOption(model="openai/gpt-4o", name="GPT-4o", price_per_1m=2.50, why="Лучший выбор для большинства задач"),
                "premium_option": ModelOption(model="anthropic/claude-3-5-sonnet", name="Claude 3.5 Sonnet", price_per_1m=3.00, why="Премиум качество")
            }
        ],
        estimated_cost={"budget": 0.30, "optimal": 5.00, "premium": 6.00},
        workflow=["Начните с GPT-4o", "При необходимости перейдите на более сильную модель"],
        is_template_match=False
    )


async def get_system_api_key(db: AsyncSession) -> str:
    """Get system API key for internal requests"""
    # In production, implement proper key management
    # For now, return a placeholder
    return "system_key"
