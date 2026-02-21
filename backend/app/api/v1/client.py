from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Optional
from decimal import Decimal

from app.db.session import get_db
from app.api.v1.auth import get_current_active_user
from app.models import User, Balance, ApiKey, RequestLog
from app.services.billing import BillingService

router = APIRouter()


async def get_user_from_auth(authorization: str = Header(None), db: AsyncSession = Depends(get_db)) -> User:
    """Get user from API key or JWT token"""
    from app.api.v1.proxy import validate_api_key
    from app.core.security import decode_token

    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization required")

    # Try API key first (for support bot)
    if authorization.startswith(("Bearer sk-", "Bearer air_")):
        result = await validate_api_key(db, authorization)
        if result:
            return result[1]  # Return user

    # Try JWT token (for frontend)
    if authorization.startswith("Bearer ey"):
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(
                    select(User).where(User.id == user_id, User.status == "active")
                )
                user = result.scalar_one_or_none()
                if user:
                    return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key or token")


@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_user_from_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get current user balance (supports JWT or API key auth)"""
    result = await db.execute(
        select(Balance).where(Balance.user_id == current_user.id)
    )
    balance = result.scalar_one_or_none()

    if not balance:
        return {
            "user_id": str(current_user.id),
            "email": current_user.email,
            "balance_usd": 0.00,
            "lifetime_spent": 0.00,
            "lifetime_earned": 0.00,
            "lifetime_savings": 0.00,
            "currency": "USD"
        }

    return {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "balance_usd": float(balance.balance_usd),
        "lifetime_spent": float(balance.lifetime_spent),
        "lifetime_earned": float(balance.lifetime_earned),
        "lifetime_savings": float(balance.lifetime_savings),
        "currency": "USD",
        "last_deposit_at": balance.last_deposit_at.isoformat() if balance.last_deposit_at else None
    }


@router.get("/usage")
async def get_usage(
    days: int = 7,
    current_user: User = Depends(get_user_from_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get usage statistics for the user"""
    stats = await BillingService.get_user_stats(db, str(current_user.id), days)
    return stats


@router.get("/usage/daily")
async def get_daily_usage(
    days: int = 30,
    current_user: User = Depends(get_user_from_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get daily usage breakdown"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            func.date(RequestLog.created_at).label("date"),
            func.count(RequestLog.id).label("requests"),
            func.sum(RequestLog.total_tokens).label("tokens"),
            func.sum(RequestLog.cost_to_client_usd).label("cost")
        )
        .where(
            RequestLog.user_id == current_user.id,
            RequestLog.created_at >= start_date
        )
        .group_by(func.date(RequestLog.created_at))
        .order_by(func.date(RequestLog.created_at).desc())
    )
    
    rows = result.all()
    return {
        "period": f"{days}d",
        "daily": [
            {
                "date": str(row.date),
                "requests": row.requests or 0,
                "tokens": int(row.tokens or 0),
                "cost_usd": float(row.cost or 0)
            }
            for row in rows
        ]
    }


@router.get("/models/usage")
async def get_models_usage(
    days: int = 30,
    current_user: User = Depends(get_user_from_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get usage statistics by model"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            RequestLog.model,
            func.count(RequestLog.id).label("requests"),
            func.sum(RequestLog.prompt_tokens).label("prompt_tokens"),
            func.sum(RequestLog.completion_tokens).label("completion_tokens"),
            func.sum(RequestLog.total_tokens).label("total_tokens"),
            func.sum(RequestLog.cost_to_client_usd).label("cost")
        )
        .where(
            RequestLog.user_id == current_user.id,
            RequestLog.created_at >= start_date
        )
        .group_by(RequestLog.model)
        .order_by(func.count(RequestLog.id).desc())
    )
    
    rows = result.all()
    return {
        "period": f"{days}d",
        "models": [
            {
                "model": row.model,
                "requests": row.requests or 0,
                "prompt_tokens": int(row.prompt_tokens or 0),
                "completion_tokens": int(row.completion_tokens or 0),
                "total_tokens": int(row.total_tokens or 0),
                "cost_usd": float(row.cost or 0)
            }
            for row in rows
        ]
    }


@router.get("/daily-usage")
async def get_daily_usage(
    days: int = 30,
    current_user: User = Depends(get_user_from_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get daily usage statistics for charts"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            func.date(RequestLog.created_at).label("date"),
            func.count(RequestLog.id).label("requests"),
            func.sum(RequestLog.total_tokens).label("tokens"),
            func.sum(RequestLog.cost_to_client_usd).label("cost"),
            func.sum(RequestLog.openrouter_cost_usd).label("openrouter_cost")
        )
        .where(
            RequestLog.user_id == current_user.id,
            RequestLog.created_at >= start_date
        )
        .group_by(func.date(RequestLog.created_at))
        .order_by(func.date(RequestLog.created_at))
    )
    
    rows = result.all()
    
    # Fill in missing dates with zeros
    from datetime import date
    date_map = {row.date: row for row in rows}
    daily_data = []
    
    for i in range(days):
        current_date = (datetime.utcnow() - timedelta(days=days-1-i)).date()
        if current_date in date_map:
            row = date_map[current_date]
            daily_data.append({
                "date": current_date.isoformat(),
                "requests": row.requests or 0,
                "tokens": int(row.tokens or 0),
                "cost_usd": float(row.cost or 0),
                "openrouter_cost_usd": float(row.openrouter_cost or 0),
                "savings_usd": float((row.openrouter_cost or 0) - (row.cost or 0))
            })
        else:
            daily_data.append({
                "date": current_date.isoformat(),
                "requests": 0,
                "tokens": 0,
                "cost_usd": 0.0,
                "openrouter_cost_usd": 0.0,
                "savings_usd": 0.0
            })
    
    return {
        "period": f"{days}d",
        "daily": daily_data
    }


@router.get("/recent-requests")
async def get_recent_requests(
    limit: int = 50,
    current_user: User = Depends(get_user_from_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get recent API requests"""
    result = await db.execute(
        select(RequestLog)
        .where(RequestLog.user_id == current_user.id)
        .order_by(RequestLog.created_at.desc())
        .limit(limit)
    )
    requests = result.scalars().all()
    
    return {
        "requests": [
            {
                "id": str(req.id),
                "model": req.model,
                "endpoint": req.endpoint,
                "prompt_tokens": req.prompt_tokens,
                "completion_tokens": req.completion_tokens,
                "total_tokens": req.total_tokens,
                "cost_usd": float(req.cost_to_client_usd),
                "status": req.status,
                "duration_ms": req.duration_ms,
                "created_at": req.created_at.isoformat() if req.created_at else None
            }
            for req in requests
        ]
    }


@router.get("/request-history")
async def get_request_history(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_user_from_auth),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed request history with price comparison and totals"""
    offset = (page - 1) * limit
    
    # Get total count
    count_result = await db.execute(
        select(func.count(RequestLog.id))
        .where(RequestLog.user_id == current_user.id)
    )
    total = count_result.scalar()
    
    # Get TOTALS for all requests (not just current page)
    totals_result = await db.execute(
        select(
            func.sum(RequestLog.cost_to_client_usd).label("total_spent"),
            func.sum(RequestLog.openrouter_cost_usd).label("total_openrouter_cost"),
            func.sum(RequestLog.total_tokens).label("total_tokens"),
            func.count(RequestLog.id).label("total_requests")
        )
        .where(RequestLog.user_id == current_user.id)
    )
    totals = totals_result.one()
    
    # Calculate total savings
    total_spent = totals.total_spent or Decimal("0")
    total_or_cost = totals.total_openrouter_cost or Decimal("0")
    # Fallback: если openrouter_cost = 0, считаем по скидке 20%
    if total_or_cost == 0 and total_spent > 0:
        total_or_cost = total_spent / Decimal("0.8")
    total_savings = total_or_cost - total_spent
    
    # Get requests with details (current page only)
    result = await db.execute(
        select(RequestLog)
        .where(RequestLog.user_id == current_user.id)
        .order_by(RequestLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    requests = result.scalars().all()
    
    return {
        "total": total,
        "page": page,
        "per_page": limit,
        "total_pages": (total + limit - 1) // limit,
        "summary": {
            "total_spent": float(total_spent),
            "total_savings": float(total_savings),
            "total_tokens": int(totals.total_tokens or 0),
            "total_requests": int(totals.total_requests or 0)
        },
        "requests": [
            {
                "id": str(req.id),
                "model": req.model,
                "endpoint": req.endpoint,
                "prompt_tokens": req.prompt_tokens,
                "completion_tokens": req.completion_tokens,
                "total_tokens": req.total_tokens,
                # Fallback: если openrouter_cost_usd = 0 (старые записи), считаем по скидке 20%
                "openrouter_cost_usd": float(req.openrouter_cost_usd if req.openrouter_cost_usd > 0 else req.cost_to_client_usd / Decimal("0.8")),
                "our_cost_usd": float(req.cost_to_us_usd),
                "client_cost_usd": float(req.cost_to_client_usd),
                "savings_usd": float((req.openrouter_cost_usd if req.openrouter_cost_usd > 0 else req.cost_to_client_usd / Decimal("0.8")) - req.cost_to_client_usd),
                "account_type": req.account_type_used,
                "status": req.status,
                "duration_ms": req.duration_ms,
                "created_at": req.created_at.isoformat() if req.created_at else None
            }
            for req in requests
        ]
    }
