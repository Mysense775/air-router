from fastapi import APIRouter, Request, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
import httpx
import json

from app.core.config import get_settings
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
settings = get_settings()


async def get_master_key():
    """Get active master key from pool"""
    keys = settings.master_keys_list
    if not keys:
        raise HTTPException(500, "No master keys configured")
    # TODO: Implement key rotation and selection logic
    return keys[0]


@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy chat completions to OpenRouter
    """
    # Get request body
    body = await request.json()
    
    # TODO: Validate API key and check balance
    # TODO: Log request
    
    master_key = await get_master_key()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {master_key}",
                    "HTTP-Referer": settings.SITE_URL,
                    "X-Title": settings.APP_NAME,
                    "Content-Type": "application/json"
                },
                json=body,
                timeout=60.0
            )
            
            # TODO: Calculate cost and deduct from balance
            # TODO: Log response with usage
            
            return response.json()
            
        except httpx.TimeoutException:
            raise HTTPException(504, "Upstream timeout")
        except Exception as e:
            raise HTTPException(502, f"Upstream error: {str(e)}")


@router.get("/models")
async def list_models():
    """List available models from OpenRouter"""
    master_key = await get_master_key()
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.OPENROUTER_BASE_URL}/models",
            headers={"Authorization": f"Bearer {master_key}"}
        )
        return response.json()


@router.post("/completions")
async def completions(request: Request):
    """Legacy completions endpoint"""
    # Similar to chat_completions
    pass


@router.post("/embeddings")
async def embeddings(request: Request):
    """Embeddings endpoint"""
    # Implementation
    pass
