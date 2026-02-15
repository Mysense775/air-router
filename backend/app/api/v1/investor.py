from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
import base64
import httpx

from app.db.session import get_db
from app.api.v1.auth import get_current_active_user
from app.models import User, InvestorAccount, InvestorPayout, InvestorRequestLog
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()

# Constants
MIN_INVESTMENT_AMOUNT = Decimal("100.00")  # Минимум $100
MIN_PAYOUT_AMOUNT = Decimal("50.00")  # Минимум $50 для выплаты
COMMISSION_RATE = Decimal("0.01")  # 1%


# Request/Response schemas
class CreateInvestorAccountRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Название ключа")
    api_key: str = Field(..., min_length=10, description="OpenRouter API Key")
    initial_balance: Decimal = Field(..., ge=MIN_INVESTMENT_AMOUNT, description="Начальный баланс")
    min_threshold: Optional[Decimal] = Field(default=Decimal("50.00"), ge=10, description="Минимальный порог")


class InvestorAccountResponse(BaseModel):
    id: str
    name: str
    initial_balance: float
    current_balance: float
    min_threshold: float
    total_earned: float
    total_spent: float
    status: str
    created_at: str
    
    class Config:
        from_attributes = True


class InvestorDashboardResponse(BaseModel):
    total_accounts: int
    total_invested: float
    total_earned: float
    current_month_earned: float
    accounts: List[InvestorAccountResponse]


class InvestorStatsResponse(BaseModel):
    account_id: str
    account_name: str
    period_days: int
    total_requests: int
    total_tokens: int
    total_spent: float
    commission_earned: float
    daily_stats: List[dict]


class PayoutResponse(BaseModel):
    id: str
    period_start: str
    period_end: str
    amount_spent: float
    commission_amount: float
    status: str
    paid_at: Optional[str]
    created_at: str


# Helper functions
def encrypt_api_key(api_key: str) -> str:
    """Шифруем API ключ (простое base64 для MVP, в проде использовать Fernet)"""
    return base64.b64encode(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Дешифруем API ключ"""
    return base64.b64decode(encrypted_key.encode()).decode()


async def verify_openrouter_key(api_key: str) -> dict:
    """Проверяем ключ через OpenRouter API"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://openrouter.ai/api/v1/credits",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(400, f"Invalid API key: {response.text}")
        except httpx.TimeoutException:
            raise HTTPException(504, "OpenRouter timeout")


# Endpoints
@router.post("/accounts", response_model=InvestorAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_investor_account(
    data: CreateInvestorAccountRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Создать инвесторский аккаунт (добавить ключ)"""
    
    # Проверяем что пользователь имеет роль investor
    if current_user.role != "investor":
        raise HTTPException(403, "Only investors can add accounts. Please contact support to change your role.")
    
    # Проверяем ключ через OpenRouter
    try:
        credits_info = await verify_openrouter_key(data.api_key)
        current_balance = Decimal(str(credits_info.get("data", {}).get("total_credits", 0)))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to verify API key: {str(e)}")
    
    # Проверяем минимальный баланс
    if current_balance < MIN_INVESTMENT_AMOUNT:
        raise HTTPException(400, f"Minimum balance is ${MIN_INVESTMENT_AMOUNT}. Current: ${current_balance}")
    
    # Проверяем что ключ еще не добавлен
    encrypted_key = encrypt_api_key(data.api_key)
    existing = await db.execute(
        select(InvestorAccount).where(InvestorAccount.api_key_encrypted == encrypted_key)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "This API key is already registered")
    
    # Создаем аккаунт
    account = InvestorAccount(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=data.name,
        api_key_encrypted=encrypted_key,
        initial_balance=data.initial_balance,
        current_balance=current_balance,
        min_threshold=data.min_threshold or Decimal("50.00"),
        commission_rate=COMMISSION_RATE,
        status="active",
        last_sync_at=datetime.utcnow()
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
        total_earned=float(account.total_earned),
        total_spent=float(account.total_spent),
        status=account.status,
        created_at=account.created_at.isoformat()
    )


@router.get("/accounts", response_model=List[InvestorAccountResponse])
async def list_investor_accounts(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Список инвесторских аккаунтов"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Access denied")
    
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
            total_earned=float(acc.total_earned),
            total_spent=float(acc.total_spent),
            status=acc.status,
            created_at=acc.created_at.isoformat()
        )
        for acc in accounts
    ]


@router.get("/dashboard", response_model=InvestorDashboardResponse)
async def get_investor_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Дашборд инвестора"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Access denied")
    
    # Получаем все аккаунты
    result = await db.execute(
        select(InvestorAccount).where(InvestorAccount.user_id == current_user.id)
    )
    accounts = result.scalars().all()
    
    # Считаем статистику
    total_invested = sum(acc.initial_balance for acc in accounts)
    total_earned = sum(acc.total_earned for acc in accounts)
    
    # Текущий месяц
    current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.sum(InvestorPayout.commission_amount))
        .join(InvestorAccount)
        .where(
            and_(
                InvestorAccount.user_id == current_user.id,
                InvestorPayout.created_at >= current_month_start
            )
        )
    )
    current_month_earned = result.scalar() or Decimal("0")
    
    return InvestorDashboardResponse(
        total_accounts=len(accounts),
        total_invested=float(total_invested),
        total_earned=float(total_earned),
        current_month_earned=float(current_month_earned),
        accounts=[
            InvestorAccountResponse(
                id=str(acc.id),
                name=acc.name,
                initial_balance=float(acc.initial_balance),
                current_balance=float(acc.current_balance),
                min_threshold=float(acc.min_threshold),
                total_earned=float(acc.total_earned),
                total_spent=float(acc.total_spent),
                status=acc.status,
                created_at=acc.created_at.isoformat()
            )
            for acc in accounts
        ]
    )


@router.get("/accounts/{account_id}/stats", response_model=InvestorStatsResponse)
async def get_account_stats(
    account_id: str,
    days: int = 30,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Статистика по конкретному аккаунту"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Access denied")
    
    # Получаем аккаунт
    result = await db.execute(
        select(InvestorAccount)
        .where(
            and_(
                InvestorAccount.id == uuid.UUID(account_id),
                InvestorAccount.user_id == current_user.id
            )
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, "Account not found")
    
    # Статистика за период
    start_date = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            func.count(InvestorRequestLog.id).label("requests"),
            func.sum(InvestorRequestLog.total_tokens).label("tokens"),
            func.sum(InvestorRequestLog.cost_usd).label("spent"),
            func.sum(InvestorRequestLog.commission_usd).label("commission")
        )
        .where(
            and_(
                InvestorRequestLog.investor_account_id == account.id,
                InvestorRequestLog.created_at >= start_date
            )
        )
    )
    stats = result.one()
    
    # Дневная статистика
    result = await db.execute(
        select(
            func.date(InvestorRequestLog.created_at).label("date"),
            func.count(InvestorRequestLog.id).label("requests"),
            func.sum(InvestorRequestLog.cost_usd).label("spent")
        )
        .where(
            and_(
                InvestorRequestLog.investor_account_id == account.id,
                InvestorRequestLog.created_at >= start_date
            )
        )
        .group_by(func.date(InvestorRequestLog.created_at))
        .order_by(func.date(InvestorRequestLog.created_at))
    )
    daily_stats = [
        {"date": str(row.date), "requests": row.requests, "spent": float(row.spent or 0)}
        for row in result.all()
    ]
    
    return InvestorStatsResponse(
        account_id=str(account.id),
        account_name=account.name,
        period_days=days,
        total_requests=stats.requests or 0,
        total_tokens=stats.tokens or 0,
        total_spent=float(stats.spent or 0),
        commission_earned=float(stats.commission or 0),
        daily_stats=daily_stats
    )


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_investor_account(
    account_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Отозвать ключ (с пометкой, не удаление)"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Access denied")
    
    result = await db.execute(
        select(InvestorAccount)
        .where(
            and_(
                InvestorAccount.id == uuid.UUID(account_id),
                InvestorAccount.user_id == current_user.id
            )
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(404, "Account not found")
    
    # Помечаем как отозванный (не удаляем для истории)
    account.status = "revoked"
    account.revoked_at = datetime.utcnow()
    
    await db.commit()


@router.get("/payouts", response_model=List[PayoutResponse])
async def list_payouts(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """История выплат"""
    
    if current_user.role != "investor":
        raise HTTPException(403, "Access denied")
    
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
            period_start=p.period_start.isoformat(),
            period_end=p.period_end.isoformat(),
            amount_spent=float(p.amount_spent),
            commission_amount=float(p.commission_amount),
            status=p.status,
            paid_at=p.paid_at.isoformat() if p.paid_at else None,
            created_at=p.created_at.isoformat()
        )
        for p in payouts
    ]
