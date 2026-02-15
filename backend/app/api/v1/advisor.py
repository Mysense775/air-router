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
    """Analyze user task using our AI Router proxy with Opus model"""
    
    # Get master account using our selector (same as proxy)
    from app.services.master_selector import MasterAccountSelector, NoAvailableAccountError
    from app.models import MasterAccount
    from sqlalchemy import select
    import base64
    
    selector = MasterAccountSelector(db)
    
    try:
        account, _ = await selector.select_account(estimated_cost=0)
    except NoAvailableAccountError:
        raise HTTPException(500, "No master accounts available")
    
    # Decrypt API key
    try:
        master_api_key = base64.b64decode(account.api_key_encrypted).decode()
    except Exception as e:
        raise HTTPException(500, "Master key decryption error")
    
    try:
        # Use our own proxy endpoint with Opus model
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/v1/proxy/chat/completions",
                headers={
                    "Authorization": f"Bearer {master_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "anthropic/claude-opus-4-5",  # Opus 4.5 for best analysis
                    "messages": [
                        {
                            "role": "system",
                            "content": """You are an elite AI model selection expert. Analyze the user's task with maximum precision and recommend the optimal stack of AI models.

Identify ALL sub-tasks, required capabilities, and constraints (context length, speed, cost sensitivity, quality requirements).

For each sub-task, recommend THREE distinct tiers:
1. Budget - cheapest viable option (good enough for the task)
2. Optimal - best price/performance balance (sweet spot)
3. Premium - maximum quality regardless of cost

Available models with exact pricing (per 1M tokens):
- openai/gpt-4o-mini: $0.15 - Ultra fast, great for drafts, simple tasks, high volume
- openai/gpt-4o: $2.50 - Excellent quality, best for most production tasks
- anthropic/claude-3-5-sonnet: $3.00 - 200K context, superior for creative writing, analysis
- anthropic/claude-3-opus: $15.00 - 200K context, best reasoning, complex problems
- anthropic/claude-opus-4-5: $75.00 - Elite tier, maximum capability
- openai/gpt-4-turbo: $10.00 - 128K context, solid alternative
- google/gemini-flash-1.5: $0.075 - Cheapest, ultra fast for simple tasks
- meta-llama/llama-3.1-70b-instruct: $0.88 - Open source, good balance

IMPORTANT clarifications:
- Video tasks: AI cannot generate video, but can write scripts, descriptions, analyze frames
- Audio tasks: Transcription, text-to-speech, music analysis (not generation)
- Image tasks: Vision models for analysis, DALL-E for generation (if available)
- Code tasks: Specify language (Python, JS, Rust, etc.)

Respond ONLY in valid JSON:
{
  "detected_tasks": ["Task 1", "Task 2"],
  "recommendations": [
    {
      "task_type": "Specific task category",
      "task_description": "What needs to be done",
      "budget_option": {"model": "provider/model", "name": "Display Name", "price_per_1m": X.XX, "why": "Specific reason"},
      "optimal_option": {"model": "provider/model", "name": "Display Name", "price_per_1m": X.XX, "why": "Specific reason"},
      "premium_option": {"model": "provider/model", "name": "Display Name", "price_per_1m": X.XX, "why": "Specific reason"}
    }
  ],
  "estimated_cost": {"budget": X.XX, "optimal": X.XX, "premium": X.XX},
  "workflow": ["Step 1...", "Step 2...", "Step 3..."]
}

Calculate realistic costs based on typical token usage (1-3M tokens per workflow cycle). Be specific in explanations."""
                        },
                        {
                            "role": "user",
                            "content": request.task
                        }
                    ],
                    "max_tokens": 3000,
                    "temperature": 0.2
                },
                timeout=60.0
            )
            
            response_data = response.json()
            
            if "error" in response_data:
                raise HTTPException(status_code=500, detail=f"AI error: {response_data['error']}")
            
            content = response_data["choices"][0]["message"]["content"]
            
            # Extract JSON from response
            json_start = content.find('{')
            json_end = content.rfind('}')
            
            if json_start == -1 or json_end == -1:
                raise ValueError("No JSON found in response")
            
            json_str = content[json_start:json_end+1]
            data = json.loads(json_str)
            
            return TaskAnalysisResponse(**data)
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI analysis timeout - Opus 4.5 is slower but more accurate")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        # Fallback
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
                        model="anthropic/claude-opus-4-5",
                        name="Claude Opus 4.5",
                        price_per_1m=75.00,
                        why="Elite tier for maximum reasoning and quality"
                    )
                }
            ],
            estimated_cost={"budget": 0.15, "optimal": 2.50, "premium": 75.00},
            workflow=[
                "Start with GPT-4o Mini for quick tests",
                "Use GPT-4o for production work",
                "Upgrade to Claude Opus 4.5 for elite quality requirements"
            ]
        )
