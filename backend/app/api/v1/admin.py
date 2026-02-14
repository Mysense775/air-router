from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from uuid import uuid4
from pydantic import BaseModel
from decimal import Decimal
import asyncio

from app.db.session import get_db
from app.models import User, RequestLog, MasterAccount
from app.api.v1.auth import get_current_active_user

router = APIRouter()

# Schemas
class MasterAccountCreate(BaseModel):
    name: str
    api_key: str
    discount_percent: int = 70
    monthly_limit_usd: float | None = None
    priority: int = 0


async def require_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/stats")
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get platform statistics"""
    # Total users
    result = await db.execute(select(func.count(User.id)))
    total_users = result.scalar()

    # Today's stats
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(
            func.count(RequestLog.id),
            func.coalesce(func.sum(RequestLog.cost_to_client_usd), 0),
            func.coalesce(func.sum(RequestLog.profit_usd), 0)
        )
        .where(RequestLog.created_at >= today)
    )
    row = result.first()
    total_requests_today = row[0] if row else 0
    revenue_today = float(row[1]) if row else 0.0
    profit_today = float(row[2]) if row else 0.0

    return {
        "total_users": total_users,
        "total_requests_today": total_requests_today,
        "revenue_today": revenue_today,
        "profit_today": profit_today
    }


@router.get("/master-accounts")
async def list_master_accounts(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List OpenRouter master accounts"""
    result = await db.execute(select(MasterAccount).order_by(MasterAccount.priority.desc()))
    accounts = result.scalars().all()

    return {
        "accounts": [
            {
                "id": str(acc.id),
                "name": acc.name,
                "balance_usd": float(acc.balance_usd),
                "discount_percent": acc.discount_percent,
                "is_active": acc.is_active,
                "priority": acc.priority,
                "monthly_limit_usd": float(acc.monthly_limit_usd) if acc.monthly_limit_usd else None,
                "monthly_used_usd": float(acc.monthly_used_usd),
            }
            for acc in accounts
        ]
    }


@router.get("/clients")
async def list_clients(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all clients"""
    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    return {
        "clients": [
            {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "status": user.status,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
            for user in users
        ]
    }


@router.get("/logs")
async def get_logs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 100
):
    """Get recent request logs"""
    result = await db.execute(
        select(RequestLog)
        .order_by(RequestLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id),
                "model": log.model,
                "endpoint": log.endpoint,
                "prompt_tokens": log.prompt_tokens,
                "completion_tokens": log.completion_tokens,
                "total_tokens": log.total_tokens,
                "cost_to_client_usd": float(log.cost_to_client_usd),
                "profit_usd": float(log.profit_usd),
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    }


@router.post("/master-accounts", status_code=status.HTTP_201_CREATED)
async def create_master_account(
    data: MasterAccountCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create new OpenRouter master account"""
    from app.core.config import get_settings
    settings = get_settings()
    
    # Simple encryption (in production use proper encryption)
    import base64
    api_key_encrypted = base64.b64encode(data.api_key.encode()).decode()
    
    account = MasterAccount(
        id=uuid4(),
        name=data.name,
        api_key_encrypted=api_key_encrypted,
        balance_usd=Decimal("0.00"),
        discount_percent=data.discount_percent,
        monthly_limit_usd=Decimal(str(data.monthly_limit_usd)) if data.monthly_limit_usd else None,
        monthly_used_usd=Decimal("0.00"),
        is_active=True,
        priority=data.priority
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    
    return {
        "id": str(account.id),
        "name": account.name,
        "balance_usd": float(account.balance_usd),
        "discount_percent": account.discount_percent,
        "is_active": account.is_active,
        "priority": account.priority,
        "message": "Master account created successfully"
    }


@router.post("/master-accounts/{account_id}/sync")
async def sync_master_account_balance(
    account_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Sync balance from OpenRouter API"""
    from uuid import UUID
    import httpx
    import base64
    import logging
    
    logger = logging.getLogger(__name__)
    
    result = await db.execute(
        select(MasterAccount).where(MasterAccount.id == UUID(account_id))
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master account not found"
        )
    
    # Decrypt API key
    try:
        api_key = base64.b64decode(account.api_key_encrypted).decode()
    except Exception as e:
        logger.error(f"Failed to decrypt API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt API key"
        )
    
    # Call OpenRouter API to get credits info with retry
    try:
        async with httpx.AsyncClient() as client:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = await client.get(
                        "https://openrouter.ai/api/v1/credits",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "HTTP-Referer": "https://airouter.host"
                        },
                        timeout=15.0
                    )
                    logger.info(f"OpenRouter credits response status: {response.status_code}, attempt: {attempt + 1}")
                    if response.status_code == 200:
                        break
                except httpx.TimeoutException:
                    logger.warning(f"OpenRouter timeout, attempt {attempt + 1}/{max_retries}")
                    if attempt == max_retries - 1:
                        raise
                    await asyncio.sleep(1)
                except httpx.NetworkError as e:
                    logger.warning(f"OpenRouter network error: {e}, attempt {attempt + 1}/{max_retries}")
                    if attempt == max_retries - 1:
                        raise
                    await asyncio.sleep(1)
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse OpenRouter credits response
                new_balance = Decimal("0.00")
                
                if "data" in data:
                    data_obj = data["data"]
                    # OpenRouter credits format:
                    # total_credits - total_usage = remaining balance
                    if "total_credits" in data_obj and "total_usage" in data_obj:
                        total_credits = float(data_obj["total_credits"])
                        total_usage = float(data_obj["total_usage"])
                        remaining = total_credits - total_usage
                        new_balance = Decimal(str(remaining))
                    # Fallback: just use total_credits if no usage
                    elif "total_credits" in data_obj:
                        new_balance = Decimal(str(data_obj["total_credits"]))
                
                account.balance_usd = new_balance
                await db.commit()
                await db.refresh(account)
                
                return {
                    "id": str(account.id),
                    "name": account.name,
                    "balance_usd": float(account.balance_usd),
                    "raw_response": data,
                    "message": f"Balance synced: ${float(new_balance):.2f}"
                }
            elif response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid OpenRouter API key"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"OpenRouter API error {response.status_code}: {response.text}"
                )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="OpenRouter API timeout"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to sync balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync balance: {str(e)}"
        )
