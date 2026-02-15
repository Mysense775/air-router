from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

from app.db.session import get_db
from app.models import User, Deposit
from app.api.v1.auth import get_current_active_user
from app.api.v1.admin import require_admin

router = APIRouter()


class TransactionResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: Optional[str]
    amount_usd: float
    amount_original: Optional[float]
    currency: str
    payment_method: str
    payment_provider: Optional[str]
    provider_transaction_id: Optional[str]
    status: str
    metadata_: dict
    created_at: str
    completed_at: Optional[str]


class TransactionStats(BaseModel):
    by_status: dict
    by_method: dict
    today_amount: float
    month_amount: float
    total_count: int
    total_amount: float


class TransactionsListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total: int
    total_amount_usd: float
    stats: TransactionStats


@router.get("/transactions", response_model=TransactionsListResponse)
async def get_transactions(
    status: Optional[str] = Query(None, description="Filter by status: completed, pending, failed"),
    method: Optional[str] = Query(None, description="Filter by method: nowpayments, manual, crypto"),
    search: Optional[str] = Query(None, description="Search by email or txid"),
    from_date: Optional[str] = Query(None, description="From date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="To date (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all transactions with filters and stats"""
    
    # Build base query with user join
    base_query = select(Deposit, User).join(User, Deposit.user_id == User.id)
    
    # Apply filters
    if status:
        base_query = base_query.where(Deposit.status == status)
    
    if method:
        base_query = base_query.where(Deposit.payment_method == method)
    
    if search:
        search_filter = or_(
            User.email.ilike(f"%{search}%"),
            User.name.ilike(f"%{search}%"),
            Deposit.provider_transaction_id.ilike(f"%{search}%")
        )
        base_query = base_query.where(search_filter)
    
    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            base_query = base_query.where(Deposit.created_at >= from_dt)
        except ValueError:
            pass
    
    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            base_query = base_query.where(Deposit.created_at < to_dt)
        except ValueError:
            pass
    
    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get total amount
    sum_query = select(func.coalesce(func.sum(Deposit.amount_usd), Decimal("0"))).select_from(base_query.subquery())
    sum_result = await db.execute(sum_query)
    total_amount = float(sum_result.scalar() or 0)
    
    # Get transactions with pagination
    query = base_query.order_by(desc(Deposit.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()
    
    transactions = []
    for deposit, user in rows:
        transactions.append(TransactionResponse(
            id=str(deposit.id),
            user_id=str(deposit.user_id),
            user_email=user.email,
            user_name=user.name,
            amount_usd=float(deposit.amount_usd),
            amount_original=float(deposit.amount_original) if deposit.amount_original else None,
            currency=deposit.currency,
            payment_method=deposit.payment_method,
            payment_provider=deposit.payment_provider,
            provider_transaction_id=deposit.provider_transaction_id,
            status=deposit.status,
            metadata_=deposit.metadata_ or {},
            created_at=deposit.created_at.isoformat() if deposit.created_at else None,
            completed_at=deposit.completed_at.isoformat() if deposit.completed_at else None
        ))
    
    # Get stats - use separate query without JOIN to avoid duplicates
    stats = await _get_transaction_stats(db, status, method, search, from_date, to_date)
    
    return TransactionsListResponse(
        transactions=transactions,
        total=total,
        total_amount_usd=total_amount,
        stats=stats
    )


async def _get_transaction_stats(db: AsyncSession, status_filter, method_filter, search_filter, from_date, to_date):
    """Calculate transaction statistics - query only Deposit table to avoid JOIN duplicates"""
    
    # Build stats query on Deposit only
    stats_base = select(Deposit)
    
    # Apply same filters but on Deposit table only
    if status_filter:
        stats_base = stats_base.where(Deposit.status == status_filter)
    
    if method_filter:
        stats_base = stats_base.where(Deposit.payment_method == method_filter)
    
    if from_date:
        try:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            stats_base = stats_base.where(Deposit.created_at >= from_dt)
        except ValueError:
            pass
    
    if to_date:
        try:
            to_dt = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            stats_base = stats_base.where(Deposit.created_at < to_dt)
        except ValueError:
            pass
    
    # Note: search_filter is skipped for stats as it requires User table
    # This keeps stats accurate without JOIN duplication
    
    # By status
    status_query = select(
        Deposit.status,
        func.count().label("count"),
        func.coalesce(func.sum(Deposit.amount_usd), Decimal("0")).label("amount")
    ).select_from(stats_base.subquery())
    status_query = status_query.group_by(Deposit.status)
    status_result = await db.execute(status_query)
    by_status = {
        row.status: {
            "count": row.count,
            "amount": float(row.amount or 0)
        } for row in status_result.all()
    }
    
    # By method
    method_query = select(
        Deposit.payment_method,
        func.count().label("count"),
        func.coalesce(func.sum(Deposit.amount_usd), Decimal("0")).label("amount")
    ).select_from(stats_base.subquery())
    method_query = method_query.group_by(Deposit.payment_method)
    method_result = await db.execute(method_query)
    by_method = {
        row.payment_method: {
            "count": row.count,
            "amount": float(row.amount or 0)
        } for row in method_result.all()
    }
    
    # Today amount
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_query = select(
        func.coalesce(func.sum(Deposit.amount_usd), Decimal("0"))
    ).select_from(stats_base.subquery())
    today_query = today_query.where(Deposit.status == "completed")
    today_query = today_query.where(Deposit.created_at >= today_start)
    today_result = await db.execute(today_query)
    today_amount = float(today_result.scalar() or 0)
    
    # Month amount
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_query = select(
        func.coalesce(func.sum(Deposit.amount_usd), Decimal("0"))
    ).select_from(stats_base.subquery())
    month_query = month_query.where(Deposit.status == "completed")
    month_query = month_query.where(Deposit.created_at >= month_start)
    month_result = await db.execute(month_query)
    month_amount = float(month_result.scalar() or 0)
    
    # Total count and amount
    total_count = sum(s["count"] for s in by_status.values())
    total_amount = sum(s["amount"] for s in by_status.values())
    
    return TransactionStats(
        by_status=by_status,
        by_method=by_method,
        today_amount=today_amount,
        month_amount=month_amount,
        total_count=total_count,
        total_amount=total_amount
    )


@router.post("/transactions/{transaction_id}/confirm")
async def confirm_transaction(
    transaction_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Manually confirm a pending transaction"""
    from uuid import UUID
    
    result = await db.execute(
        select(Deposit).where(Deposit.id == UUID(transaction_id))
    )
    deposit = result.scalar_one_or_none()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if deposit.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction already completed"
        )
    
    if deposit.status == "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot confirm failed transaction"
        )
    
    # Update deposit status
    deposit.status = "completed"
    deposit.completed_at = datetime.utcnow()
    
    # Add balance to user
    from app.models import Balance
    
    result = await db.execute(
        select(Balance).where(Balance.user_id == deposit.user_id)
    )
    balance = result.scalar_one_or_none()
    
    if balance:
        balance.balance_usd += deposit.amount_usd
        balance.lifetime_earned += deposit.amount_usd
        balance.last_deposit_at = datetime.utcnow()
    else:
        balance = Balance(
            user_id=deposit.user_id,
            balance_usd=deposit.amount_usd,
            lifetime_earned=deposit.amount_usd,
            last_deposit_at=datetime.utcnow()
        )
        db.add(balance)
    
    await db.commit()
    await db.refresh(deposit)
    
    return {
        "id": str(deposit.id),
        "status": deposit.status,
        "message": f"Transaction confirmed. Added ${float(deposit.amount_usd):.2f} to user balance."
    }


@router.post("/transactions/{transaction_id}/fail")
async def fail_transaction(
    transaction_id: str,
    reason: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Mark transaction as failed"""
    from uuid import UUID
    
    result = await db.execute(
        select(Deposit).where(Deposit.id == UUID(transaction_id))
    )
    deposit = result.scalar_one_or_none()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if deposit.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark completed transaction as failed"
        )
    
    deposit.status = "failed"
    if reason:
        metadata = deposit.metadata_ or {}
        metadata["fail_reason"] = reason
        metadata["failed_by"] = str(admin.id)
        metadata["failed_at"] = datetime.utcnow().isoformat()
        deposit.metadata_ = metadata
    
    await db.commit()
    await db.refresh(deposit)
    
    return {
        "id": str(deposit.id),
        "status": deposit.status,
        "message": "Transaction marked as failed"
    }
