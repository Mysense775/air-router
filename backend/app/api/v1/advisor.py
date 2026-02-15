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


@router.post("/analyze-task", response_model=TaskAnalysisResponse)
async def analyze_task(
    request: TaskAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Analyze user task using AI and recommend AI model stack"""
    
    # Get OpenRouter API key from environment or database
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_key:
        # Try to get from master accounts
        from app.models import MasterAccount
        from sqlalchemy import select
        result = await db.execute(
            select(MasterAccount).where(MasterAccount.is_active == True).limit(1)
        )
        master = result.scalar_one_or_none()
        if master:
            import base64
            openrouter_key = base64.b64decode(master.api_key_encrypted).decode()
    
    if not openrouter_key:
        raise HTTPException(status_code=500, detail="No OpenRouter API key available")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "HTTP-Referer": "https://airouter.host",
                    "X-Title": "AI Router Model Advisor"
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are an AI model selection expert. Analyze the user's task and recommend the best stack of AI models.

Identify all sub-tasks and types of generation needed (text, code, analysis, creative, long-context, multimodal, etc.).

For each sub-task, recommend THREE options:
1. Budget - cheapest option that still works well
2. Optimal - best price/quality balance  
3. Premium - highest quality regardless of price

Available models with real prices (per 1M tokens):
- openai/gpt-4o-mini: $0.15 - Fast, cheap, good for drafts, simple code, summaries
- openai/gpt-4o: $2.50 - High quality, great for final texts, complex code, analysis
- anthropic/claude-3-5-sonnet: $3.00 - Best for long context (200K), creative writing, nuanced analysis
- anthropic/claude-3-opus: $15.00 - Premium quality, very long context, complex reasoning
- openai/gpt-4-turbo: $10.00 - Good balance, large context (128K)
- google/gemini-flash-1.5: $0.075 - Ultra cheap, fast, good for simple tasks
- meta-llama/llama-3.1-70b-instruct: $0.88 - Good open source alternative

Be specific and accurate. If user asks about video, clarify that AI doesn't generate video but can help with scripts, descriptions, analysis. If about audio - clarify it's about transcription or text-to-speech. If about images - mention vision models.

Respond ONLY in JSON format:
{
  "detected_tasks": ["task1", "task2"],
  "recommendations": [
    {
      "task_type": "e.g., Code Generation",
      "task_description": "Specific description of this sub-task",
      "budget_option": {"model": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "price_per_1m": 0.15, "why": "Why this model for budget"},
      "optimal_option": {"model": "openai/gpt-4o", "name": "GPT-4o", "price_per_1m": 2.50, "why": "Why this is optimal"},
      "premium_option": {"model": "anthropic/claude-3-opus", "name": "Claude 3 Opus", "price_per_1m": 15.00, "why": "Why premium"}
    }
  ],
  "estimated_cost": {"budget": 0.45, "optimal": 7.50, "premium": 25.00},
  "workflow": ["Step 1: Use X for...", "Step 2: Use Y for..."]
}

Calculate estimated_cost as sum of price_per_1m for optimal options * 1M tokens expected usage (be realistic - small tasks ~0.5-1M, larger ~2-3M)."""
                        },
                        {
                            "role": "user",
                            "content": request.task
                        }
                    ],
                    "max_tokens": 2500,
                    "temperature": 0.3
                },
                timeout=45.0
            )
            
            response_data = response.json()
            
            if "error" in response_data:
                raise HTTPException(status_code=500, detail=f"OpenRouter error: {response_data['error']}")
            
            content = response_data["choices"][0]["message"]["content"]
            
            # Extract JSON from response
            # Try to find JSON block
            json_start = content.find('{')
            json_end = content.rfind('}')
            
            if json_start == -1 or json_end == -1:
                raise ValueError("No JSON found in response")
            
            json_str = content[json_start:json_end+1]
            data = json.loads(json_str)
            
            return TaskAnalysisResponse(**data)
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI analysis timeout - please try again")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        # Fallback to generic recommendation if AI fails
        return TaskAnalysisResponse(
            detected_tasks=["General AI Tasks"],
            recommendations=[
                {
                    "task_type": "Universal Task",
                    "task_description": request.task[:100],
                    "budget_option": ModelOption(
                        model="openai/gpt-4o-mini",
                        name="GPT-4o Mini",
                        price_per_1m=0.15,
                        why="Fast and cheap for testing and simple tasks"
                    ),
                    "optimal_option": ModelOption(
                        model="openai/gpt-4o",
                        name="GPT-4o",
                        price_per_1m=2.50,
                        why="Best choice for most tasks - high quality at reasonable price"
                    ),
                    "premium_option": ModelOption(
                        model="anthropic/claude-3-opus",
                        name="Claude 3 Opus",
                        price_per_1m=15.00,
                        why="Maximum quality for critical tasks requiring best reasoning"
                    )
                }
            ],
            estimated_cost={"budget": 0.15, "optimal": 2.50, "premium": 15.00},
            workflow=[
                "Start with GPT-4o Mini for quick tests",
                "Use GPT-4o for production work",
                "Upgrade to Claude 3 Opus if you need maximum quality"
            ]
        )
