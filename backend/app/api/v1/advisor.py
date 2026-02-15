from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.v1.auth import get_current_active_user
from app.models import User

router = APIRouter()

class TaskAnalysisRequest(BaseModel):
    task: str

class ModelRecommendation(BaseModel):
    model: str
    name: str
    task: str
    why: str

class TaskAnalysisResponse(BaseModel):
    recommendations: list[ModelRecommendation]
    workflow: list[str]

# Локальная база знаний на основе файла пользователя
MODEL_CATALOG = {
    # ВИДЕОГЕНЕРАЦИЯ
    "video_generation": {
        "keywords": ["видео", "video", "youtube", "tiktok", "reels", "ролик", "сгенерировать видео", "video generation"],
        "models": [
            {"model": "openai/sora-2", "name": "Sora 2", "why": "Синхронизированный звук, диалоги, физически точное движение", "price": "$0.50/sec"},
            {"model": "google/veo-3.2", "name": "Veo 3.2", "why": "Нативный 4K HDR, генерация аудио (эффекты + диалоги)", "price": "$0.45/sec"},
            {"model": "runway/gen-4.5", "name": "Runway Gen-4.5", "why": "Motion Brush, точный контроль камеры, сториборды", "price": "$0.40/sec"},
            {"model": "kling/kling-2.6", "name": "Kling 2.6", "why": "До 2 минут, мульти-шотовые последовательности, бюджетный", "price": "$0.07/sec"},
            {"model": "pika/pika-2.5", "name": "Pika 2.5", "why": "Pikaswaps, быстрая смена стилей для соцсетей", "price": "$0.15/sec"},
        ]
    },
    
    # ИЗОБРАЖЕНИЯ
    "image_generation": {
        "keywords": ["изображение", "image", "картинка", "логотип", "баннер", "illustration", "logo", "фото", "picture"],
        "models": [
            {"model": "openai/gpt-image-1.5", "name": "GPT Image 1.5", "why": "Революционная генерация текста (логотипы, типографика), ELO 1264", "price": "$0.20/img"},
            {"model": "google/imagen-4", "name": "Imagen 4", "why": "Сложная типографика, многострочные тексты", "price": "$0.15/img"},
            {"model": "black-forest-labs/flux-2-max", "name": "FLUX 2 Max", "why": "12B, LoRA поддержка, работает на RTX 4090", "price": "$0.08/img"},
            {"model": "ideogram/ideogram-3.0", "name": "Ideogram 3.0", "why": "90% точность рендеринга текста, макеты и плакаты", "price": "$0.12/img"},
            {"model": "recraft-ai/recraft-v3", "name": "Recraft v3", "why": "Векторная графика, брендовые ассеты", "price": "$0.10/img"},
        ]
    },
    
    # OCR И ДОКУМЕНТЫ
    "ocr_documents": {
        "keywords": ["ocr", "pdf", "документ", "document", "сканирование", "инвойс", "таблица", "распознавание", "extraction"],
        "models": [
            {"model": "deepseek/deepseek-ocr", "name": "DeepSeek OCR", "why": "Компрессия токенов 20×, 97% точность, $0.09/1000 страниц", "price": "$0.09/1K pages"},
            {"model": "pragna/chandra-ocr", "name": "Chandra OCR", "why": "9B, точность 83.1% olmOCR-Bench, формулы и таблицы", "price": "$0.12/1K pages"},
            {"model": "allenai/olmocr-2", "name": "olmOCR 2", "why": "Оптимизирована для научных статей, Apache 2.0", "price": "$0.15/1K pages"},
            {"model": "alibaba/qwen2.5-vl-72b", "name": "Qwen2.5-VL-72B", "why": "72B, 131K контекст, bounding boxes, структурирование инвойсов", "price": "$0.90/1M tokens"},
            {"model": "zhipu-ai/glm-4.5v", "name": "GLM-4.5V", "why": "106B MoE, 66K контекст, Thinking Mode, 3D-RoPE для layout", "price": "$1.50/1M tokens"},
        ]
    },
    
    # НАУЧНЫЕ ТЕКСТЫ И КОД
    "science_code": {
        "keywords": ["наука", "science", "математика", "math", "код", "code", "python", "программирование", "reasoning", "доказательство"],
        "models": [
            {"model": "deepseek/deepseek-r1-0528", "name": "DeepSeek-R1-0528", "why": "671B MoE, 128K контекст, RL-based reasoning, математические доказательства", "price": "$2.19/1M tokens"},
            {"model": "anthropic/claude-opus-4-5", "name": "Claude Opus 4.5", "why": "200K контекст, длинные тексты и код, архитектурное планирование", "price": "$75.00/1M tokens"},
            {"model": "openai/gpt-5.2", "name": "GPT-5.2", "why": "200K контекст, креативные задачи, междисциплинарный синтез", "price": "$10.00/1M tokens"},
            {"model": "alibaba/qwen-3", "name": "Qwen 3", "why": "235B MoE, 1M токенов контекст, 119 языков, переключаемые режимы", "price": "$1.20/1M tokens"},
            {"model": "meta/llama-4-scout", "name": "Llama 4 Scout", "why": "10 миллионов токенов контекста, инфер на одном GPU", "price": "$0.90/1M tokens"},
        ]
    },
    
    # ОБЩИЕ ТЕКСТОВЫЕ ЗАДАЧИ
    "text_general": {
        "keywords": ["текст", "text", "статья", "article", "блог", "blog", "писать", "write", "копирайтинг", "seo"],
        "models": [
            {"model": "openai/gpt-4o", "name": "GPT-4o", "why": "Лучшее качество для большинства текстовых задач", "price": "$2.50/1M tokens"},
            {"model": "anthropic/claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "why": "200K контекст, превосходное креативное письмо", "price": "$3.00/1M tokens"},
            {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "why": "Быстро и дёшево для черновиков", "price": "$0.15/1M tokens"},
        ]
    },
    
    # ДЛИННЫЕ КОНТЕКСТЫ
    "long_context": {
        "keywords": ["длинный", "long context", "книга", "book", "1000 страниц", "1m tokens", "миллион токенов", "large document"],
        "models": [
            {"model": "meta/llama-4-scout", "name": "Llama 4 Scout", "why": "10M токенов контекста — рекорд", "price": "$0.90/1M tokens"},
            {"model": "alibaba/qwen-3", "name": "Qwen 3", "why": "1M токенов, 119 языков", "price": "$1.20/1M tokens"},
            {"model": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "why": "1M+ токенов, 30 изображений или 1 час видео за промпт", "price": "$3.50/1M tokens"},
            {"model": "anthropic/claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "why": "200K контекст, отличное качество", "price": "$3.00/1M tokens"},
        ]
    },
    
    # ВИДЕНИЕ И АНАЛИЗ ИЗОБРАЖЕНИЙ
    "vision": {
        "keywords": ["vision", "анализ изображения", "image analysis", "описать картинку", "vision model", "просмотреть фото"],
        "models": [
            {"model": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "why": "1M+ контекст, видео час за промпт", "price": "$3.50/1M tokens"},
            {"model": "alibaba/qwen2.5-vl-72b", "name": "Qwen2.5-VL-72B", "why": "131K контекст, bounding boxes, понимание документов", "price": "$0.90/1M tokens"},
            {"model": "openai/gpt-4o", "name": "GPT-4o", "why": "Отличное vision для большинства задач", "price": "$2.50/1M tokens"},
        ]
    },
}


def analyze_task_locally(task: str) -> TaskAnalysisResponse:
    """Analyze task using local keyword matching"""
    task_lower = task.lower()
    recommendations = []
    detected_categories = []
    
    # Проверяем каждую категорию
    for category, data in MODEL_CATALOG.items():
        for keyword in data["keywords"]:
            if keyword in task_lower:
                detected_categories.append(category)
                # Берём лучшую модель из категории (первую в списке)
                best_model = data["models"][0]
                
                # Формируем задачу для этой категории
                task_desc = {
                    "video_generation": "Генерация видео",
                    "image_generation": "Генерация изображений",
                    "ocr_documents": "OCR и обработка документов",
                    "science_code": "Научные вычисления и код",
                    "text_general": "Текстовые задачи",
                    "long_context": "Обработка длинных контекстов",
                    "vision": "Анализ изображений и видео"
                }.get(category, "Задача")
                
                recommendations.append(ModelRecommendation(
                    model=best_model["model"],
                    name=best_model["name"],
                    task=task_desc,
                    why=f"{best_model['why']} ({best_model['price']})"
                ))
                break  # Одна модель из категории достаточна
    
    # Если ничего не нашли — даём GPT-4o
    if not recommendations:
        recommendations.append(ModelRecommendation(
            model="openai/gpt-4o",
            name="GPT-4o",
            task="Универсальная задача",
            why="Лучший выбор для большинства задач ($2.50/1M tokens)"
        ))
    
    # Формируем workflow
    workflow = []
    if len(recommendations) == 1:
        workflow.append(f"Используйте {recommendations[0].name} для выполнения задачи")
        workflow.append("При необходимости настройте параметры генерации")
    else:
        for i, rec in enumerate(recommendations, 1):
            workflow.append(f"Шаг {i}: Используйте {rec.name} — {rec.task}")
        workflow.append(f"Шаг {len(recommendations)+1}: Интегрируйте результаты")
    
    return TaskAnalysisResponse(
        recommendations=recommendations,
        workflow=workflow
    )


@router.post("/analyze-task", response_model=TaskAnalysisResponse)
async def analyze_task(
    request: TaskAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Analyze user task using local knowledge base (no AI call)"""
    return analyze_task_locally(request.task)
