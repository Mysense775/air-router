from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from pydantic import BaseModel
from typing import Optional, Literal
from uuid import UUID
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models import User, Balance, ApiKey, RequestLog, Deposit
from app.api.v1.auth import get_current_active_user
from app.api.v1.admin import require_admin
from app.core.security import create_access_token

router = APIRouter()


class UserDetailResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    role: str
    status: str
    email_verified: bool
    created_at: str
    updated_at: str


class UserBalanceResponse(BaseModel):
    balance_usd: float
    lifetime_spent: float
    lifetime_earned: float
    lifetime_savings: float
    last_deposit_at: Optional[str]


class UserApiKeyResponse(BaseModel):
    id: str
    name: str
    allowed_model: Optional[str]
    is_active: bool
    last_used_at: Optional[str]
    created_at: str


class UserRequestResponse(BaseModel):
    id: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cost_to_client_usd: float
    status: str
    created_at: str


class UserDepositResponse(BaseModel):
    id: str
    amount_usd: float
    currency: str
    payment_method: str
    status: str
    created_at: str


class UserFullDetailsResponse(BaseModel):
    user: UserDetailResponse
    balance: Optional[UserBalanceResponse]
    api_keys: list[UserApiKeyResponse]
    recent_requests: list[UserRequestResponse]
    recent_deposits: list[UserDepositResponse]
    stats: dict


class UpdateRoleRequest(BaseModel):
    role: Literal["client", "admin", "investor"]


class UpdateRoleResponse(BaseModel):
    id: str
    email: str
    old_role: str
    new_role: str
    message: str


class ImpersonateResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: dict
    message: str


@router.get("/users/{user_id}/details", response_model=UserFullDetailsResponse)
async def get_user_details(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get full details about a user (for admin view)"""
    
    # Get user
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get balance
    result = await db.execute(select(Balance).where(Balance.user_id == UUID(user_id)))
    balance = result.scalar_one_or_none()
    
    # Get API keys
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == UUID(user_id))
        .order_by(desc(ApiKey.created_at))
    )
    api_keys = result.scalars().all()
    
    # Get recent requests
    result = await db.execute(
        select(RequestLog)
        .where(RequestLog.user_id == UUID(user_id))
        .order_by(desc(RequestLog.created_at))
        .limit(50)
    )
    requests = result.scalars().all()
    
    # Get recent deposits
    result = await db.execute(
        select(Deposit)
        .where(Deposit.user_id == UUID(user_id))
        .order_by(desc(Deposit.created_at))
        .limit(20)
    )
    deposits = result.scalars().all()
    
    # Calculate stats
    result = await db.execute(
        select(
            func.count(RequestLog.id),
            func.coalesce(func.sum(RequestLog.cost_to_client_usd), 0),
            func.coalesce(func.sum(RequestLog.total_tokens), 0)
        )
        .where(RequestLog.user_id == UUID(user_id))
    )
    stats_row = result.first()
    
    result = await db.execute(
        select(func.coalesce(func.sum(Deposit.amount_usd), 0))
        .where(Deposit.user_id == UUID(user_id))
        .where(Deposit.status == "completed")
    )
    total_deposits = float(result.scalar() or 0)
    
    return UserFullDetailsResponse(
        user=UserDetailResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            status=user.status,
            email_verified=user.email_verified,
            created_at=user.created_at.isoformat() if user.created_at else None,
            updated_at=user.updated_at.isoformat() if user.updated_at else None
        ),
        balance=UserBalanceResponse(
            balance_usd=float(balance.balance_usd) if balance else 0.0,
            lifetime_spent=float(balance.lifetime_spent) if balance else 0.0,
            lifetime_earned=float(balance.lifetime_earned) if balance else 0.0,
            lifetime_savings=float(balance.lifetime_savings) if balance else 0.0,
            last_deposit_at=balance.last_deposit_at.isoformat() if balance and balance.last_deposit_at else None
        ) if balance else None,
        api_keys=[
            UserApiKeyResponse(
                id=str(key.id),
                name=key.name,
                allowed_model=key.allowed_model,
                is_active=key.is_active,
                last_used_at=key.last_used_at.isoformat() if key.last_used_at else None,
                created_at=key.created_at.isoformat() if key.created_at else None
            )
            for key in api_keys
        ],
        recent_requests=[
            UserRequestResponse(
                id=str(req.id),
                model=req.model,
                prompt_tokens=req.prompt_tokens,
                completion_tokens=req.completion_tokens,
                cost_to_client_usd=float(req.cost_to_client_usd),
                status=req.status,
                created_at=req.created_at.isoformat() if req.created_at else None
            )
            for req in requests
        ],
        recent_deposits=[
            UserDepositResponse(
                id=str(dep.id),
                amount_usd=float(dep.amount_usd),
                currency=dep.currency,
                payment_method=dep.payment_method,
                status=dep.status,
                created_at=dep.created_at.isoformat() if dep.created_at else None
            )
            for dep in deposits
        ],
        stats={
            "total_requests": stats_row[0] if stats_row else 0,
            "total_spent": float(stats_row[1]) if stats_row else 0.0,
            "total_tokens": stats_row[2] if stats_row else 0,
            "total_deposits": total_deposits
        }
    )


@router.put("/users/{user_id}/role", response_model=UpdateRoleResponse)
async def update_user_role(
    user_id: str,
    data: UpdateRoleRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user role (admin only)"""
    
    # Cannot change own role
    if str(admin.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    # Get user
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    old_role = user.role
    user.role = data.role
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return UpdateRoleResponse(
        id=str(user.id),
        email=user.email,
        old_role=old_role,
        new_role=user.role,
        message=f"Role updated from {old_role} to {user.role}"
    )


@router.post("/users/{user_id}/impersonate", response_model=ImpersonateResponse)
async def impersonate_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get access token to impersonate a user (admin only)"""
    from app.core.config import get_settings
    
    settings = get_settings()
    
    # Get user
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Cannot impersonate other admins (safety)
    if user.role == "admin" and str(admin.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot impersonate other admins"
        )
    
    # Create short-lived token (1 hour)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "impersonated_by": str(admin.id)  # Track who impersonated
        },
        expires_delta=timedelta(hours=1)
    )
    
    return ImpersonateResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=3600,
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role
        },
        message=f"Impersonating user {user.email}. Token valid for 1 hour."
    )


@router.post("/users/{user_id}/balance/add")
async def add_user_balance_admin(
    user_id: str,
    amount: float,
    reason: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Add balance to user (admin only)"""
    from decimal import Decimal
    
    # Get user
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    # Get or create balance
    result = await db.execute(select(Balance).where(Balance.user_id == UUID(user_id)))
    balance = result.scalar_one_or_none()
    
    old_balance = float(balance.balance_usd) if balance else 0.0
    
    if not balance:
        balance = Balance(
            user_id=user_id,
            balance_usd=Decimal(str(amount)),
            lifetime_earned=Decimal(str(amount))
        )
        db.add(balance)
    else:
        balance.balance_usd += Decimal(str(amount))
        balance.lifetime_earned += Decimal(str(amount))
        balance.last_deposit_at = datetime.utcnow()
    
    # Create deposit record
    deposit = Deposit(
        user_id=user_id,
        amount_usd=Decimal(str(amount)),
        currency="USD",
        status="completed",
        payment_method="manual",
        provider_transaction_id=f"admin_{datetime.utcnow().timestamp()}",
        metadata_={
            "reason": reason,
            "added_by": str(admin.id),
            "added_by_email": admin.email
        }
    )
    db.add(deposit)
    
    await db.commit()
    await db.refresh(balance)
    
    return {
        "user_id": user_id,
        "email": user.email,
        "old_balance": old_balance,
        "new_balance": float(balance.balance_usd),
        "added_amount": amount,
        "reason": reason,
        "message": f"Added ${amount:.2f} to {user.email}. New balance: ${float(balance.balance_usd):.2f}"
    }
