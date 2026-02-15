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
                            "content": """You are an elite AI model selection expert with knowledge of cutting-edge models. Analyze the user's task with maximum precision and recommend the optimal stack.

Identify ALL sub-tasks, required capabilities, and constraints (context length, speed, cost, multimodal needs).

For each sub-task, recommend THREE distinct tiers:
1. Budget - cheapest viable option
2. Optimal - best price/performance balance
3. Premium - maximum quality regardless of cost

=== TEXT & CHAT MODELS ===
- openai/gpt-4o-mini: $0.15 - Ultra fast, drafts, simple tasks
- openai/gpt-4o: $2.50 - Best for most production tasks
- anthropic/claude-3-5-sonnet: $3.00 - 200K context, creative writing
- anthropic/claude-3-opus: $15.00 - Complex reasoning, 200K context
- anthropic/claude-opus-4-5: $75.00 - Elite tier, maximum capability
- deepseek/deepseek-r1-0528: $2.19 - 671B MoE, RL reasoning, math proofs
- openai/gpt-5.2: $10.00 - 200K context, creative synthesis
- alibaba/qwen-3: $1.20 - 235B MoE, 1M context, 119 languages
- google/gemini-2.5-pro: $3.50 - 1M+ context, 30 images per prompt
- meta/llama-4-scout: $0.90 - 10M context, single GPU inference

=== VIDEO GENERATION (per second) ===
- openai/sora-2: $0.50/sec - Synced sound, dialogues, physics-accurate
- google/veo-3.2: $0.45/sec - Native 4K HDR, audio generation
- runway/gen-4.5: $0.40/sec - Motion Brush, camera control, storyboards
- kling/kling-2.6: $0.07/sec - Up to 2 min, multi-shot sequences
- pika/pika-2.5: $0.15/sec - Style swaps, social media optimized

=== IMAGE GENERATION (per image) ===
- openai/gpt-image-1.5: $0.20 - Revolutionary text rendering, logos
- google/imagen-4: $0.15 - Complex typography, multi-line text
- black-forest-labs/flux-2-max: $0.08 - 12B, LoRA support
- ideogram/ideogram-3.0: $0.12 - 90% text accuracy, posters
- recraft-ai/recraft-v3: $0.10 - Vector graphics, brand assets

=== OCR & DOCUMENT ANALYSIS ===
- pragna/chandra-ocr: $0.12/1000 pages - 83.1% accuracy, formulas, tables
- allenai/olmocr-2: $0.15/1000 pages - Scientific papers, Apache 2.0
- deepseek/deepseek-ocr: $0.09/1000 pages - 20x token compression, 97% accuracy
- alibaba/qwen2.5-vl-72b: $0.90 - 131K context, bounding boxes, invoices
- zhipu-ai/glm-4.5v: $1.50 - 106B MoE, 3D-RoPE layout analysis

=== VISION MODELS ===
- google/gemini-2.5-pro: $3.50 - 1M context, video hour per prompt
- alibaba/qwen2.5-vl-72b: $0.90 - Document understanding, spatial reasoning

IMPORTANT:
- Video = generation now available! Mention video models for video tasks
- Images = generation available, not just analysis
- OCR = specialized models for document extraction
- Long context = up to 10M tokens with Llama 4 Scout

Respond ONLY in valid JSON:
{
  "detected_tasks": ["Task 1", "Task 2"],
  "recommendations": [
    {
      "task_type": "Category",
      "task_description": "Description",
      "budget_option": {"model": "...", "name": "...", "price_per_1m": X.XX, "why": "..."},
      "optimal_option": {"model": "...", "name": "...", "price_per_1m": X.XX, "why": "..."},
      "premium_option": {"model": "...", "name": "...", "price_per_1m": X.XX, "why": "..."}
    }
  ],
  "estimated_cost": {"budget": X.XX, "optimal": X.XX, "premium": X.XX},
  "workflow": ["Step 1...", "Step 2..."]
}

For video: price_per_1m = price per second (show as $/sec in why). For images: price per image."""
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
        # Fallback with expanded model knowledge
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
                        why="Ultra fast, great for drafts and testing"
                    ),
                    "optimal_option": ModelOption(
                        model="openai/gpt-4o",
                        name="GPT-4o",
                        price_per_1m=2.50,
                        why="Best for most production tasks"
                    ),
                    "premium_option": ModelOption(
                        model="anthropic/claude-opus-4-5",
                        name="Claude Opus 4.5",
                        price_per_1m=75.00,
                        why="Elite tier for maximum reasoning"
                    )
                }
            ],
            estimated_cost={"budget": 0.15, "optimal": 2.50, "premium": 75.00},
            workflow=[
                "Start with GPT-4o Mini for quick tests",
                "Use GPT-4o for production work",
                "For video: consider Kling 2.6 ($0.07/sec) or Sora 2 ($0.50/sec)",
                "For OCR: DeepSeek OCR ($0.09/1000 pages) or Chandra OCR",
                "Upgrade to Claude Opus 4.5 for elite requirements"
            ]
        )
