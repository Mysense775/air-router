from fastapi import APIRouter, Request, HTTPException, Depends, Header, status
from fastapi.responses import StreamingResponse
import httpx
import json
import time
import logging
from decimal import Decimal
from typing import Optional, Tuple, Union

from app.core.config import get_settings
from app.db.session import get_db
from app.services.billing import BillingService, PricingService
from app.services.master_selector import MasterAccountSelector, NoAvailableAccountError
from app.models import ApiKey, User, MasterAccount, Balance, InvestorAccount
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


async def get_master_account_with_pricing(
    db: AsyncSession, 
    estimated_cost: Decimal = Decimal("0")
) -> Tuple[Union[MasterAccount, InvestorAccount], str, Decimal]:
    """
    Get master account using priority queue and calculate pricing
    
    Priority: Discounted -> Investor -> Regular
    
    Returns:
        - MasterAccount or InvestorAccount: selected account
        - str: decrypted API key
        - Decimal: price multiplier for client (0.8 discounted, 1.10 investor/regular)
    """
    import base64
    
    selector = MasterAccountSelector(db)
    
    try:
        account, price_multiplier = await selector.select_account(estimated_cost)
    except NoAvailableAccountError:
        raise HTTPException(500, "No master accounts available with sufficient balance")
    
    # Decrypt API key (works for both MasterAccount and InvestorAccount)
    try:
        api_key = base64.b64decode(account.api_key_encrypted).decode()
        return account, api_key, price_multiplier
    except Exception as e:
        logger.error(f"Failed to decrypt master key: {e}")
        raise HTTPException(500, "Master key decryption error")


async def validate_api_key(
    db: AsyncSession,
    authorization: str
) -> Optional[tuple[ApiKey, User]]:
    """Validate API key from Authorization header and return key with user"""
    if not authorization.startswith("Bearer "):
        return None
    
    key = authorization.replace("Bearer ", "").strip()
    
    # Hash the key for lookup
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
        return row[0], row[1]
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
    requested_model = body.get("model", "openai/gpt-4o")
    
    # Check if API key is restricted to specific model
    if api_key.allowed_model and api_key.allowed_model != requested_model:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Model not allowed",
                "message": f"This API key is restricted to model: {api_key.allowed_model}",
                "requested_model": requested_model,
                "allowed_model": api_key.allowed_model
            }
        )
    
    model = requested_model
    
    # ЛЕНИВАЯ ЗАГРУЗКА: Получаем цену из кэша или OpenRouter API
    pricing, was_fetched = await PricingService.get_or_fetch_model_pricing(db, model)
    if not pricing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Model not found",
                "message": f"No pricing available for model: {model}",
                "model": model
            }
        )
    
    if was_fetched:
        logger.info(f"Fresh pricing fetched from OpenRouter for {model}")
    else:
        logger.debug(f"Using cached pricing for {model}")
    
    # Get master account with priority queue
    account, master_key, price_multiplier = await get_master_account_with_pricing(db)
    
    # Calculate cost with account type using NEW method
    estimated_tokens = body.get("max_tokens", 1000)
    
    # For initial reservation, use basic calculation (no base fee for platform requests)
    base_cost = BillingService.calculate_cost(
        model, 
        len(body.get("messages", [])),
        estimated_tokens,
        pricing
    )
    estimated_client_cost = base_cost["real_cost_usd"] * price_multiplier
    
    logger.info(f"Estimated cost for {model}: ${estimated_client_cost:.6f}")
    
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
            
            # Get ACTUAL cost from OpenRouter response
            actual_openrouter_cost = Decimal(str(usage.get("cost", 0)))
            
            # Use actual cost from OpenRouter if available, otherwise fall back to calculation
            if actual_openrouter_cost > 0:
                cost_breakdown = BillingService.calculate_cost_from_openrouter_actual(
                    actual_openrouter_cost,
                    account
                )
                logger.info(
                    f"Using actual OpenRouter cost for {model}: "
                    f"OR cost=${actual_openrouter_cost:.8f}, "
                    f"Client=${cost_breakdown['client_cost_usd']:.8f}"
                )
            else:
                # Fallback to token-based calculation if OpenRouter doesn't provide cost
                cost_breakdown = BillingService.calculate_cost_with_account(
                    model,
                    prompt_tokens,
                    completion_tokens,
                    account,
                    pricing
                )
                logger.warning(
                    f"OpenRouter cost not provided for {model}, using calculated cost: "
                    f"${cost_breakdown['client_cost_usd']:.8f}"
                )
            
            actual_client_cost = cost_breakdown["client_cost_usd"]
            our_cost = cost_breakdown["our_cost_usd"]
            profit = cost_breakdown["profit_usd"]
            savings = cost_breakdown["savings_usd"]
            account_type = cost_breakdown["account_type"]
            
            # Log cost comparison for monitoring
            if actual_openrouter_cost > 0:
                logger.info(
                    f"Cost breakdown for {model} - "
                    f"OR actual: ${actual_openrouter_cost:.8f}, "
                    f"Client: ${actual_client_cost:.8f}, "
                    f"Our cost: ${our_cost:.8f}, "
                    f"Profit: ${profit:.8f}"
                )
            
            # Handle billing: refund difference if actual < estimated
            if reserved_amount > actual_client_cost:
                refund_amount = reserved_amount - actual_client_cost
                await BillingService.release_balance(db, user_id, refund_amount)
                logger.info(f"Refunded {refund_amount} USD to user {user_id}")
            
            # If actual cost > reserved, charge extra
            if actual_client_cost > reserved_amount:
                extra_charge = actual_client_cost - reserved_amount
                await db.execute(
                    update(Balance)
                    .where(
                        Balance.user_id == user_id,
                        Balance.balance_usd >= extra_charge
                    )
                    .values(
                        balance_usd=Balance.balance_usd - extra_charge,
                        updated_at=datetime.utcnow()
                    )
                )
                await db.commit()
            
            # Update lifetime_spent
            result = await db.execute(
                select(Balance).where(Balance.user_id == user_id)
            )
            balance = result.scalar_one_or_none()
            if balance:
                balance.lifetime_spent += actual_client_cost
                await db.flush()
                await db.commit()
            
            # Add savings if positive
            if savings > 0:
                result_savings = await db.execute(
                    select(Balance).where(Balance.user_id == user_id)
                )
                balance_savings = result_savings.scalar_one_or_none()
                if balance_savings:
                    balance_savings.lifetime_savings += savings
                    await db.commit()
            
            # Deduct from master account balance
            if isinstance(account, InvestorAccount):
                # For investor accounts, track total spent
                account.total_spent = (account.total_spent or Decimal("0")) + our_cost
                # Commission is calculated in cost_breakdown
            else:
                account.balance_usd -= our_cost
            await db.commit()
            
            # Log request with account_type
            await BillingService.log_request(
                db=db,
                user_id=user_id,
                api_key_id=api_key_id,
                master_account_id=str(account.id),
                model=model,
                endpoint="/chat/completions",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_breakdown=cost_breakdown,
                duration_ms=duration_ms,
                status="success" if response.status_code == 200 else "error",
                status_code=response.status_code,
                account_type_used=account_type
            )
            
            # Add cost info to response
            pricing_str = BillingService.get_account_type_description(account_type)
            
            response_data["cost"] = {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "cost_usd": float(actual_client_cost),
                "currency": "USD",
                "account_type": account_type,
                "pricing": pricing_str,
                "savings_usd": float(savings) if savings > 0 else 0.0
            }
            
            return response_data
            
        except httpx.TimeoutException:
            if reserved_amount:
                await BillingService.release_balance(db, user_id, reserved_amount)
                logger.warning(f"Refunded {reserved_amount} USD due to timeout")
            
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
                    "profit_usd": Decimal("0"),
                    "account_type": "timeout"
                },
                duration_ms=int((time.time() - start_time) * 1000),
                status="timeout",
                error_message="Upstream timeout",
                account_type_used="timeout"
            )
            raise HTTPException(504, "Upstream timeout")
            
        except Exception as e:
            if reserved_amount:
                await BillingService.release_balance(db, user_id, reserved_amount)
                logger.warning(f"Refunded {reserved_amount} USD due to error: {e}")
            
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
                    "profit_usd": Decimal("0"),
                    "account_type": "error"
                },
                duration_ms=int((time.time() - start_time) * 1000),
                status="error",
                error_message=str(e),
                account_type_used="error"
            )
            raise HTTPException(502, f"Upstream error: {str(e)}")


@router.get("/models")
async def list_models(db: AsyncSession = Depends(get_db)):
    """List available models from OpenRouter using priority queue"""
    try:
        account, master_key, _ = await get_master_account_with_pricing(db)
    except HTTPException:
        raise HTTPException(500, "No master keys configured")

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
