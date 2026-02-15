from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_, text
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timedelta

from app.db.session import get_db
from app.api.v1.auth import get_current_active_user
from app.models import User, MasterAccount, InvestorAccount, InvestorPayout, RequestLog

router = APIRouter()

class RevenueByType(BaseModel):
    account_type: str
    revenue: float
    cost: float
    profit: float
    margin_percent: float
    requests_count: int

class InvestorKeySummary(BaseModel):
    total: int
    active: int
    paused: int
    revoked: int
    total_balance: float
    total_commission_paid: float

class DashboardStatsResponse(BaseModel):
    total_revenue: dict
    by_account_type: List[RevenueByType]
    investor_keys: InvestorKeySummary

class InvestorAccountAdminResponse(BaseModel):
    id: str
    user_email: str
    user_name: str
    name: str
    initial_balance: float
    current_balance: float
    min_threshold: float
    total_earned: float
    total_spent: float
    status: str
    created_at: str
    last_sync_at: Optional[str]

@router.get("/dashboard-stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить статистику доходов платформы"""
    
    if current_user.role != "admin":
        raise HTTPException(403, "Access denied")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # 1. Общие доходы (сегодня, месяц, всё время)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    result = await db.execute(
        select(
            func.sum(RequestLog.cost_to_client_usd).filter(RequestLog.created_at >= today_start).label("today"),
            func.sum(RequestLog.cost_to_client_usd).filter(RequestLog.created_at >= start_date).label("period"),
            func.sum(RequestLog.cost_to_client_usd).label("total")
        )
    )
    revenue_stats = result.one()
    
    # 2. Доходы по типам аккаунтов (discounted, regular, investor)
    # Для investor нужно проверить request_logs через investor_account_id
    result = await db.execute(
        select(
            case(
                (RequestLog.master_account_id.is_(None), "investor"),
                else_=MasterAccount.account_type
            ).label("account_type"),
            func.sum(RequestLog.cost_to_client_usd).label("revenue"),
            func.sum(RequestLog.cost_to_us_usd).label("cost"),
            func.sum(RequestLog.profit_usd).label("profit"),
            func.count(RequestLog.id).label("requests_count")
        )
        .select_from(RequestLog)
        .outerjoin(MasterAccount, RequestLog.master_account_id == MasterAccount.id)
        .filter(RequestLog.created_at >= start_date)
        .group_by("account_type")
    )
    
    by_type = []
    for row in result.all():
        revenue = float(row.revenue or 0)
        cost = float(row.cost or 0)
        profit = float(row.profit or 0)
        margin = (profit / revenue * 100) if revenue > 0 else 0
        
        by_type.append(RevenueByType(
            account_type=row.account_type or "unknown",
            revenue=revenue,
            cost=cost,
            profit=profit,
            margin_percent=round(margin, 1),
            requests_count=row.requests_count or 0
        ))
    
    # 3. Статистика инвесторских ключей
    result = await db.execute(
        select(
            func.count(InvestorAccount.id).label("total"),
            func.count(case((InvestorAccount.status == "active", 1))).label("active"),
            func.count(case((InvestorAccount.status == "paused", 1))).label("paused"),
            func.count(case((InvestorAccount.status == "revoked", 1))).label("revoked"),
            func.sum(InvestorAccount.current_balance).label("total_balance"),
            func.sum(InvestorAccount.total_earned).label("total_commission")
        )
    )
    inv_stats = result.one()
    
    investor_summary = InvestorKeySummary(
        total=inv_stats.total or 0,
        active=inv_stats.active or 0,
        paused=inv_stats.paused or 0,
        revoked=inv_stats.revoked or 0,
        total_balance=float(inv_stats.total_balance or 0),
        total_commission_paid=float(inv_stats.total_commission or 0)
    )
    
    return DashboardStatsResponse(
        total_revenue={
            "today": float(revenue_stats.today or 0),
            "this_month": float(revenue_stats.period or 0),
            "total": float(revenue_stats.total or 0)
        },
        by_account_type=by_type,
        investor_keys=investor_summary
    )


@router.get("/investor-accounts", response_model=List[InvestorAccountAdminResponse])
async def list_investor_accounts_admin(
    status: Optional[str] = Query(None, enum=["active", "paused", "revoked"]),
    search: Optional[str] = Query(None),
    min_balance: Optional[float] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Список всех инвесторских аккаунтов (для админа)"""
    
    if current_user.role != "admin":
        raise HTTPException(403, "Access denied")
    
    query = (
        select(InvestorAccount, User)
        .join(User, InvestorAccount.user_id == User.id)
    )
    
    # Фильтры
    if status:
        query = query.filter(InvestorAccount.status == status)
    
    if min_balance is not None:
        query = query.filter(InvestorAccount.current_balance >= min_balance)
    
    if search:
        search_filter = text("""
            users.email ILIKE :search OR 
            users.name ILIKE :search OR 
            investor_accounts.name ILIKE :search
        """)
        query = query.filter(search_filter.bindparams(search=f"%{search}%"))
    
    query = query.order_by(InvestorAccount.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    return [
        InvestorAccountAdminResponse(
            id=str(acc.id),
            user_email=user.email,
            user_name=user.name or "",
            name=acc.name,
            initial_balance=float(acc.initial_balance),
            current_balance=float(acc.current_balance),
            min_threshold=float(acc.min_threshold),
            total_earned=float(acc.total_earned),
            total_spent=float(acc.total_spent),
            status=acc.status,
            created_at=acc.created_at.isoformat(),
            last_sync_at=acc.last_sync_at.isoformat() if acc.last_sync_at else None
        )
        for acc, user in rows
    ]


@router.post("/investor-accounts/{account_id}/pause")
async def pause_investor_account(
    account_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Приостановить инвесторский ключ"""
    
    if current_user.role != "admin":
        raise HTTPException(403, "Access denied")
    
    from uuid import UUID
    result = await db.execute(
        select(InvestorAccount).where(InvestorAccount.id == UUID(account_id))
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(404, "Account not found")
    
    account.status = "paused"
    await db.commit()
    
    return {"status": "success", "message": "Account paused"}


@router.post("/investor-accounts/{account_id}/activate")
async def activate_investor_account(
    account_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Активировать инвесторский ключ"""
    
    if current_user.role != "admin":
        raise HTTPException(403, "Access denied")
    
    from uuid import UUID
    result = await db.execute(
        select(InvestorAccount).where(InvestorAccount.id == UUID(account_id))
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(404, "Account not found")
    
    account.status = "active"
    await db.commit()
    
    return {"status": "success", "message": "Account activated"}


@router.post("/investor-accounts/{account_id}/revoke")
async def revoke_investor_account(
    account_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Отозвать инвесторский ключ (окончательно)"""
    
    if current_user.role != "admin":
        raise HTTPException(403, "Access denied")
    
    from uuid import UUID
    result = await db.execute(
        select(InvestorAccount).where(InvestorAccount.id == UUID(account_id))
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(404, "Account not found")
    
    account.status = "revoked"
    account.revoked_at = datetime.utcnow()
    await db.commit()
    
    return {"status": "success", "message": "Account revoked"}
