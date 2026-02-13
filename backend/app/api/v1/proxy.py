from fastapi import APIRouter, Request, HTTPException, Depends, Header, status
from fastapi.responses import StreamingResponse
import httpx
import json
import time
import logging
from decimal import Decimal
from typing import Optional, Tuple

from app.core.config import get_settings
from app.db.session import get_db
from app.services.billing import BillingService, PricingService
from app.models import ApiKey, User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


async def get_master_key():
    """Get active master key from pool"""
    keys = settings.master_keys_list
    if not keys:
        raise HTTPException(500, "No master keys configured")
    return keys[0]


async def validate_api_key(
    db: AsyncSession,
    authorization: str
) -> Optional[tuple[ApiKey, User]]:
    """Validate API key from Authorization header and return key with user"""
    if not authorization.startswith("Bearer "):
        return None
    
    key = authorization.replace("Bearer ", "").strip()
    
    # Hash the key for lookup (in production, use proper hashing with salt)
    import hashlib
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    
    result = await db.execute(
        select(ApiKey, User)
        .join(User, ApiKey.user_id == User.id)
        .where(
            ApiKey.key_hash == key_hash,
            ApiKey.is_active == True,
            User.status == "active"
        )
    )
    row = result.one_or_none()
    if row:
        return row[0], row[1]  # api_key, user
    return None


@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Proxy chat completions to OpenRouter with billing
    """
    start_time = time.time()
    reserved_amount = None
    user_id = None
    api_key_id = None
    
    # Validate API key
    validation_result = await validate_api_key(db, authorization)
    if not validation_result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    api_key, user = validation_result
    user_id = str(user.id)
    api_key_id = str(api_key.id)
    
    # Get request body
    body = await request.json()
    model = body.get("model", "openai/gpt-4o")
    
    # Get model pricing for cost estimation
    pricing = await PricingService.get_model_pricing(db, model)
    
    # Estimate max cost (will be adjusted after actual usage)
    estimated_tokens = body.get("max_tokens", 1000)
    estimated_cost = BillingService.calculate_cost(
        model, 
        len(body.get("messages", [])),
        estimated_tokens,
        pricing
    )
    estimated_client_cost = estimated_cost["client_cost_usd"]
    
    # Reserve balance BEFORE making the request
    reserved = await BillingService.reserve_balance(
        db,
        user_id,
        estimated_client_cost
    )
    if not reserved:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Insufficient balance",
                "message": "Please top up your balance",
                "required": float(estimated_client_cost)
            }
        )
    reserved_amount = estimated_client_cost
    
    # Get master key
    master_key = await get_master_key()
    
    # Proxy request to OpenRouter
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
            
            response_data = response.json()
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Extract usage from response
            usage = response_data.get("usage", {})
            prompt_tokens = usage.get("prompt_tokens", 0)
            completion_tokens = usage.get("completion_tokens", 0)
            
            # Calculate actual cost
            cost_breakdown = BillingService.calculate_cost(
                model,
                prompt_tokens,
                completion_tokens,
                pricing
            )
            actual_cost = cost_breakdown["client_cost_usd"]
            
            # Handle billing: refund difference if actual < estimated
            if reserved_amount > actual_cost:
                refund_amount = reserved_amount - actual_cost
                await BillingService.release_balance(db, user_id, refund_amount)
                logger.info(f"Refunded {refund_amount} USD to user {user_id} (reserved: {reserved_amount}, actual: {actual_cost})")
            
            # Update lifetime_spent with actual cost (reserve already deducted)
            await BillingService.deduct_balance(db, user_id, Decimal("0"))  # Just updates lifetime stats
            
            # Log request
            await BillingService.log_request(
                db=db,
                user_id=user_id,
                api_key_id=api_key_id,
                master_account_id=None,  # TODO: Track which master key was used
                model=model,
                endpoint="/chat/completions",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_breakdown=cost_breakdown,
                duration_ms=duration_ms,
                status="success" if response.status_code == 200 else "error",
                status_code=response.status_code
            )
            
            # Add cost info to response
            response_data["cost"] = {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "cost_usd": float(actual_cost),
                "currency": "USD"
            }
            
            return response_data
            
        except httpx.TimeoutException:
            # Refund reserved amount on timeout
            if reserved_amount:
                await BillingService.release_balance(db, user_id, reserved_amount)
                logger.warning(f"Refunded {reserved_amount} USD to user {user_id} due to timeout")
            
            # Log timeout
            await BillingService.log_request(
                db=db,
                user_id=user_id,
                api_key_id=api_key_id,
                master_account_id=None,
                model=model,
                endpoint="/chat/completions",
                prompt_tokens=0,
                completion_tokens=0,
                cost_breakdown={
                    "real_cost_usd": Decimal("0"),
                    "our_cost_usd": Decimal("0"),
                    "client_cost_usd": Decimal("0"),
                    "profit_usd": Decimal("0")
                },
                duration_ms=int((time.time() - start_time) * 1000),
                status="timeout",
                error_message="Upstream timeout"
            )
            raise HTTPException(504, "Upstream timeout")
            
        except Exception as e:
            # Refund reserved amount on any error
            if reserved_amount:
                await BillingService.release_balance(db, user_id, reserved_amount)
                logger.warning(f"Refunded {reserved_amount} USD to user {user_id} due to error: {e}")
            
            # Log error
            logger.error(f"Upstream error for user {user_id}: {type(e).__name__}: {e}")
            await BillingService.log_request(
                db=db,
                user_id=user_id,
                api_key_id=api_key_id,
                master_account_id=None,
                model=model,
                endpoint="/chat/completions",
                prompt_tokens=0,
                completion_tokens=0,
                cost_breakdown={
                    "real_cost_usd": Decimal("0"),
                    "our_cost_usd": Decimal("0"),
                    "client_cost_usd": Decimal("0"),
                    "profit_usd": Decimal("0")
                },
                duration_ms=int((time.time() - start_time) * 1000),
                status="error",
                error_message=str(e)
            )
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
    raise HTTPException(501, "Not implemented yet")


@router.post("/embeddings")
async def embeddings(request: Request):
    """Embeddings endpoint"""
    raise HTTPException(501, "Not implemented yet")
