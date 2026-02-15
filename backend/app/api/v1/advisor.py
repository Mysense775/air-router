from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
import json
import os

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


@router.post("/analyze-task", response_model=TaskAnalysisResponse)
async def analyze_task(
    request: TaskAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Analyze user task and recommend optimal model stack"""
    
    from app.services.master_selector import MasterAccountSelector, NoAvailableAccountError
    from app.models import MasterAccount
    from sqlalchemy import select
    import base64
    
    selector = MasterAccountSelector(db)
    
    try:
        account, _ = await selector.select_account(estimated_cost=0)
    except NoAvailableAccountError:
        raise HTTPException(500, "No master accounts available")
    
    try:
        master_api_key = base64.b64decode(account.api_key_encrypted).decode()
    except Exception as e:
        raise HTTPException(500, "Master key decryption error")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/v1/proxy/chat/completions",
                headers={
                    "Authorization": f"Bearer {master_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "anthropic/claude-opus-4-5",
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are an AI model selection expert. Analyze the user's task and recommend the OPTIMAL stack of models.

For each sub-task, recommend ONE best model (not three tiers - just the optimal choice).

Available models:
TEXT & CHAT:
- openai/gpt-4o-mini: $0.15 - Fast, cheap, drafts
- openai/gpt-4o: $2.50 - Best for most tasks
- anthropic/claude-3-5-sonnet: $3.00 - 200K context, creative
- anthropic/claude-opus-4-5: $75.00 - Elite reasoning
- deepseek/deepseek-r1-0528: $2.19 - Math, RL reasoning
- google/gemini-2.5-pro: $3.50 - 1M context, vision
- alibaba/qwen-3: $1.20 - 1M context, 119 languages

VIDEO GENERATION (per second):
- openai/sora-2: $0.50 - Synced sound, dialogues
- google/veo-3.2: $0.45 - 4K HDR, audio
- runway/gen-4.5: $0.40 - Motion Brush, camera control
- kling/kling-2.6: $0.07 - Budget option, 2 min clips
- pika/pika-2.5: $0.15 - Style swaps, social media

IMAGE GENERATION (per image):
- openai/gpt-image-1.5: $0.20 - Text rendering, logos
- google/imagen-4: $0.15 - Typography
- black-forest-labs/flux-2-max: $0.08 - Open source
- ideogram/ideogram-3.0: $0.12 - 90% text accuracy

OCR & DOCUMENTS (per 1000 pages):
- deepseek/deepseek-ocr: $0.09 - 97% accuracy
- pragna/chandra-ocr: $0.12 - Formulas, tables
- allenai/olmocr-2: $0.15 - Scientific papers

VISION:
- alibaba/qwen2.5-vl-72b: $0.90 - Document understanding

Respond ONLY in JSON:
{
  "recommendations": [
    {"model": "provider/model", "name": "Display Name", "task": "What this model does", "why": "Why it's optimal"}
  ],
  "workflow": ["Step 1: Do X with Model Y", "Step 2: Do Z with Model W"]
}"""
                        },
                        {
                            "role": "user",
                            "content": request.task
                        }
                    ],
                    "max_tokens": 2000,
                    "temperature": 0.3
                },
                timeout=60.0
            )
            
            response_data = response.json()
            
            if "error" in response_data:
                raise HTTPException(status_code=500, detail=f"AI error: {response_data['error']}")
            
            content = response_data["choices"][0]["message"]["content"]
            
            json_start = content.find('{')
            json_end = content.rfind('}')
            
            if json_start == -1 or json_end == -1:
                raise ValueError("No JSON found in response")
            
            json_str = content[json_start:json_end+1]
            data = json.loads(json_str)
            
            return TaskAnalysisResponse(**data)
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI analysis timeout")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        # Fallback - generic recommendation
        return TaskAnalysisResponse(
            recommendations=[
                ModelRecommendation(
                    model="openai/gpt-4o",
                    name="GPT-4o",
                    task="Универсальная задача",
                    why="Лучший выбор для большинства задач"
                )
            ],
            workflow=[
                "Шаг 1: Используйте GPT-4o для выполнения задачи",
                "Шаг 2: При необходимости переключитесь на специализированную модель"
            ]
        )
