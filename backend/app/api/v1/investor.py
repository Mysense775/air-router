from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
import base64

from app.db.session import get_db
from app.api.v1.auth import get_current_active_user
from app.models import User, InvestorAccount, InvestorPayout, InvestorRequestLog
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


# Request/Response schemas
class CreateInvestorAccountRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    api_key: str = Field(..., min_length=10)
    initial_balance: Decimal = Field(..., ge=100)  # Минимум $100
    min_threshold: Optional[Decimal] = Field(default=50, ge=10)


class InvestorAccountResponse(BaseModel):
    id: str
    name: str
    initial_balance: float
    current_balance: float
    min_threshold: float
    commission_rate: float
    total_earned: float
    total_spent: float
    status: str
    created_at: str
    
    class Config:
        from_attributes = True


class InvestorDashboardResponse(BaseModel):
    total_invested: float
    total_earned: float
    monthly_earned: float
    active_accounts: int
    accounts: List[InvestorAccountResponse]


class InvestorStatsResponse(BaseModel):
    period: str
    total_requests: int
    total_tokens: int
    total_spent: float
    commission_earned: float
    top_models: List[dict]


class PayoutResponse(BaseModel):
    id: str
    period_start: str
    period_end: str
    amount_spent: float
    commission_amount: float
    status: str
    paid_at: Optional[str]


@router.post("/accounts", response_model=InvestorAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_investor_account(
    data: CreateInvestorAccountRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Создать инвесторский аккаунт (добавить ключ)"""
    
    # Проверяем, что пользователь - инвестор
    if current_user.role != "investor":
        raise HTTPException(403, "Only investors can create investor accounts")
    
    # Шифруем API ключ
    encrypted_key = base64.b64encode(data.api_key.encode()).decode()
    
    # Создаем аккаунт
    account = InvestorAccount(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=data.name,
        api_key_encrypted=encrypted_key,
        initial_balance=data.initial_balance,
        current_balance=data.initial_balance,
        min_threshold=data.min_threshold or Decimal("50.00"),
        commission_rate=Decimal("1.00"),  # 1% по умолчанию
        status="active"
    )
    
    db.add(account)
    await db.commit()
    await db.refresh(account)
    
    return InvestorAccountResponse(
        id=str(account.id),
        name=account.name,
        initial_balance=float(account.initial_balance),
        current_balance=float(account.current_balance),
        min_threshold=float(account.min_threshold),
        commission_rate=float(account.commission_rate),
        total_earned=float(account.total_earned),
        total_spent=float(account.total_spent),
        status=account.status,
        created_at=account.created_at.isoformat() if account.created_at else None
    )


@router.get("/accounts", response_model=List[InvestorAccountResponse])
async def list_investor_accounts(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Список инвесторских аккаунтов"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Only investors can view accounts")
    
    result = await db.execute(
        select(InvestorAccount)
        .where(InvestorAccount.user_id == current_user.id)
        .order_by(InvestorAccount.created_at.desc())
    )
    accounts = result.scalars().all()
    
    return [
        InvestorAccountResponse(
            id=str(acc.id),
            name=acc.name,
            initial_balance=float(acc.initial_balance),
            current_balance=float(acc.current_balance),
            min_threshold=float(acc.min_threshold),
            commission_rate=float(acc.commission_rate),
            total_earned=float(acc.total_earned),
            total_spent=float(acc.total_spent),
            status=acc.status,
            created_at=acc.created_at.isoformat() if acc.created_at else None
        )
        for acc in accounts
    ]


@router.get("/accounts/{account_id}", response_model=InvestorAccountResponse)
async def get_investor_account(
    account_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Детали инвесторского аккаунта"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Only investors can view accounts")
    
    result = await db.execute(
        select(InvestorAccount)
        .where(InvestorAccount.id == account_id)
        .where(InvestorAccount.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(404, "Account not found")
    
    return InvestorAccountResponse(
        id=str(account.id),
        name=account.name,
        initial_balance=float(account.initial_balance),
        current_balance=float(account.current_balance),
        min_threshold=float(account.min_threshold),
        commission_rate=float(account.commission_rate),
        total_earned=float(account.total_earned),
        total_spent=float(account.total_spent),
        status=account.status,
        created_at=account.created_at.isoformat() if account.created_at else None
    )


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_investor_account(
    account_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Отозвать ключ (с предупреждением за 7 дней)"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Only investors can revoke accounts")
    
    result = await db.execute(
        select(InvestorAccount)
        .where(InvestorAccount.id == account_id)
        .where(InvestorAccount.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(404, "Account not found")
    
    # Проверяем, что аккаунт активен минимум 7 дней
    if account.created_at and (datetime.utcnow() - account.created_at) < timedelta(days=7):
        raise HTTPException(400, "Account can only be revoked after 7 days")
    
    account.status = "revoked"
    account.revoked_at = datetime.utcnow()
    await db.commit()
    
    return None


@router.get("/dashboard", response_model=InvestorDashboardResponse)
async def get_investor_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Дашборд инвестора"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Only investors can view dashboard")
    
    # Получаем все аккаунты
    result = await db.execute(
        select(InvestorAccount)
        .where(InvestorAccount.user_id == current_user.id)
    )
    accounts = result.scalars().all()
    
    # Считаем статистику
    total_invested = sum(acc.initial_balance for acc in accounts)
    total_earned = sum(acc.total_earned for acc in accounts)
    active_accounts = sum(1 for acc in accounts if acc.status == "active")
    
    # Заработок за текущий месяц
    current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.sum(InvestorPayout.commission_amount))
        .join(InvestorAccount)
        .where(InvestorAccount.user_id == current_user.id)
        .where(InvestorPayout.period_start >= current_month_start)
        .where(InvestorPayout.status == "paid")
    )
    monthly_earned = result.scalar() or 0
    
    return InvestorDashboardResponse(
        total_invested=float(total_invested),
        total_earned=float(total_earned),
        monthly_earned=float(monthly_earned),
        active_accounts=active_accounts,
        accounts=[
            InvestorAccountResponse(
                id=str(acc.id),
                name=acc.name,
                initial_balance=float(acc.initial_balance),
                current_balance=float(acc.current_balance),
                min_threshold=float(acc.min_threshold),
                commission_rate=float(acc.commission_rate),
                total_earned=float(acc.total_earned),
                total_spent=float(acc.total_spent),
                status=acc.status,
                created_at=acc.created_at.isoformat() if acc.created_at else None
            )
            for acc in accounts
        ]
    )


@router.get("/accounts/{account_id}/stats", response_model=InvestorStatsResponse)
async def get_account_stats(
    account_id: str,
    period: str = "30d",  # 7d, 30d, 90d
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Статистика по аккаунту (модели без данных клиентов)"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Only investors can view stats")
    
    # Проверяем доступ
    result = await db.execute(
        select(InvestorAccount)
        .where(InvestorAccount.id == account_id)
        .where(InvestorAccount.user_id == current_user.id)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(404, "Account not found")
    
    # Определяем период
    days = int(period.replace("d", ""))
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Получаем статистику
    result = await db.execute(
        select(
            func.count(InvestorRequestLog.id),
            func.sum(InvestorRequestLog.total_tokens),
            func.sum(InvestorRequestLog.cost_usd),
            func.sum(InvestorRequestLog.commission_usd)
        )
        .where(InvestorRequestLog.investor_account_id == account_id)
        .where(InvestorRequestLog.created_at >= start_date)
    )
    stats = result.one()
    
    # Топ моделей (без данных клиентов)
    result = await db.execute(
        select(
            InvestorRequestLog.model,
            func.count(InvestorRequestLog.id).label("count"),
            func.sum(InvestorRequestLog.total_tokens).label("tokens")
        )
        .where(InvestorRequestLog.investor_account_id == account_id)
        .where(InvestorRequestLog.created_at >= start_date)
        .group_by(InvestorRequestLog.model)
        .order_by(func.count(InvestorRequestLog.id).desc())
        .limit(5)
    )
    top_models = [
        {"model": row.model, "requests": row.count, "tokens": row.tokens}
        for row in result.all()
    ]
    
    return InvestorStatsResponse(
        period=period,
        total_requests=stats[0] or 0,
        total_tokens=stats[1] or 0,
        total_spent=float(stats[2] or 0),
        commission_earned=float(stats[3] or 0),
        top_models=top_models
    )


@router.get("/payouts", response_model=List[PayoutResponse])
async def list_payouts(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """История выплат инвестору"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Only investors can view payouts")
    
    result = await db.execute(
        select(InvestorPayout)
        .join(InvestorAccount)
        .where(InvestorAccount.user_id == current_user.id)
        .order_by(InvestorPayout.created_at.desc())
    )
    payouts = result.scalars().all()
    
    return [
        PayoutResponse(
            id=str(p.id),
            period_start=p.period_start.isoformat() if p.period_start else None,
            period_end=p.period_end.isoformat() if p.period_end else None,
            amount_spent=float(p.amount_spent),
            commission_amount=float(p.commission_amount),
            status=p.status,
            paid_at=p.paid_at.isoformat() if p.paid_at else None
        )
        for p in payouts
    ]
