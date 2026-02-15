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
from app.services.master_selector import MasterAccountSelector, NoAvailableAccountError
from app.models import ApiKey, User, MasterAccount, Balance, InvestorAccount
from typing import Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


async def get_master_account_with_pricing(db: AsyncSession, estimated_cost: Decimal = Decimal("0")) -> Tuple[Union[MasterAccount, InvestorAccount], str, Decimal]:
    """
    Get master account using priority queue and calculate pricing
    
    Priority: Discounted -> Investor -> Regular
    
    Returns:
        - MasterAccount or InvestorAccount: selected account
        - str: decrypted API key
        - Decimal: price multiplier for client (0.8 discounted, 0.95 investor, 1.05 regular)
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
    
    # Получаем мастер-аккаунт с учетом приоритетной очереди
    # и ценовым множителем (0.8 для discounted, 1.05 для regular)
    account, master_key, price_multiplier = await get_master_account_with_pricing(
        db, 
        estimated_cost["real_cost_usd"]
    )
    
    # Рассчитываем стоимость для клиента с учетом типа аккаунта
    estimated_client_cost = estimated_cost["real_cost_usd"] * price_multiplier
    
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
            
            # Calculate actual cost from upstream
            cost_breakdown = BillingService.calculate_cost(
                model,
                prompt_tokens,
                completion_tokens,
                pricing
            )
            
            # Наши реальные затраты (зависят от типа аккаунта)
            our_cost = cost_breakdown["real_cost_usd"] * account.cost_basis
            
            # Стоимость для клиента (с наценкой/скидкой)
            actual_client_cost = cost_breakdown["real_cost_usd"] * price_multiplier
            
            # Прибыль
            profit = actual_client_cost - our_cost
            
            # Handle billing: refund difference if actual < estimated
            if reserved_amount > actual_client_cost:
                refund_amount = reserved_amount - actual_client_cost
                await BillingService.release_balance(db, user_id, refund_amount)
                logger.info(f"Refunded {refund_amount} USD to user {user_id} (reserved: {reserved_amount}, actual: {actual_client_cost})")
            
            # Если фактическая стоимость выше резерва — списываем дополнительно
            if actual_client_cost > reserved_amount:
                extra_charge = actual_client_cost - reserved_amount
                await BillingService.deduct_balance(db, user_id, extra_charge)
            
            # Update lifetime_spent напрямую (не через deduct_balance чтобы не списать дважды)
            result = await db.execute(
                select(Balance).where(Balance.user_id == user_id)
            )
            balance = result.scalar_one_or_none()
            if balance:
                balance.lifetime_spent += actual_client_cost
                await db.flush()
                await db.commit()
            
            # Рассчитываем сбережения клиента (сколько сэкономил vs OpenRouter)
            savings = cost_breakdown["real_cost_usd"] - actual_client_cost
            if savings > 0:
                # Добавляем сбережения к lifetime_savings
                result_savings = await db.execute(select(Balance).where(Balance.user_id == user_id))
                balance_savings = result_savings.scalar_one_or_none()
                if balance_savings:
                    balance_savings.lifetime_savings += savings
                    await db.commit()
            
            # Спишем с баланса мастер-аккаунта
            account.balance_usd -= our_cost
            await db.commit()
            
            # Log request
            await BillingService.log_request(
                db=db,
                user_id=user_id,
                api_key_id=api_key_id,
                master_account_id=str(account.id),
                model=model,
                endpoint="/chat/completions",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost_breakdown={
                    "real_cost_usd": cost_breakdown["real_cost_usd"],
                    "our_cost_usd": our_cost,
                    "client_cost_usd": actual_client_cost,
                    "profit_usd": profit
                },
                duration_ms=duration_ms,
                status="success" if response.status_code == 200 else "error",
                status_code=response.status_code
            )
            
            # Дополнительно сохраним тип аккаунта в лог (для аналитики)
            # TODO: добавить поле account_type_used в RequestLog
            
            # Add cost info to response
            # Handle both MasterAccount and InvestorAccount
            if isinstance(account, InvestorAccount):
                account_type_str = "investor"
                pricing_str = "investor (-5%)"
            else:
                account_type_str = account.account_type
                pricing_str = f"{'-' if account.markup_percent < 0 else '+'}{abs(account.markup_percent)}%"
            
            response_data["cost"] = {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "cost_usd": float(actual_client_cost),
                "currency": "USD",
                "account_type": account_type_str,
                "pricing": pricing_str
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
