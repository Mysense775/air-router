from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from uuid import uuid4
from pydantic import BaseModel
from decimal import Decimal
import asyncio

from app.db.session import get_db
from app.models import User, RequestLog, MasterAccount, Balance, Deposit
from app.api.v1.auth import get_current_active_user

router = APIRouter()

# Schemas
class MasterAccountCreate(BaseModel):
    name: str
    api_key: str
    account_type: str = "discounted"  # "discounted" или "regular"
    discount_percent: int = 70  # legacy, для совместимости
    monthly_limit_usd: float | None = None
    priority: int = 0
    
    def get_account_params(self):
        """Возвращает параметры в зависимости от типа аккаунта"""
        if self.account_type == "discounted":
            return {
                "markup_percent": -20,  # Продаём дешевле номинала
                "cost_basis": Decimal("0.30"),  # Платим 30% от номинала
                "priority": 0,  # Высший приоритет
                "discount_percent": 70
            }
        else:  # regular
            return {
                "markup_percent": 5,  # Продаём дороже номинала
                "cost_basis": Decimal("1.00"),  # Платим 100% от номинала
                "priority": 1,  # Резервный приоритет
                "discount_percent": 0
            }


class UserCreate(BaseModel):
    email: str
    name: str | None = None
    role: str = "client"  # "client" or "admin"


class UserCreateResponse(BaseModel):
    id: str
    email: str
    name: str | None
    role: str
    temporary_password: str
    message: str


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
    """List all clients with balance"""
    from app.models import Balance
    
    result = await db.execute(
        select(User, Balance)
        .outerjoin(Balance, User.id == Balance.user_id)
        .order_by(User.created_at.desc())
    )
    users_data = result.all()

    return {
        "clients": [
            {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "status": user.status,
                "balance_usd": float(balance.balance_usd) if balance else 0.0,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
            for user, balance in users_data
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
    """Create new OpenRouter master account with type selection"""
    # Validate account type
    if data.account_type not in ["discounted", "regular"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="account_type must be 'discounted' or 'regular'"
        )
    
    # Get parameters based on account type
    params = data.get_account_params()
    
    # Simple encryption (in production use proper encryption)
    import base64
    api_key_encrypted = base64.b64encode(data.api_key.encode()).decode()
    
    account = MasterAccount(
        id=uuid4(),
        name=data.name,
        api_key_encrypted=api_key_encrypted,
        balance_usd=Decimal("0.00"),
        account_type=data.account_type,
        markup_percent=params["markup_percent"],
        cost_basis=params["cost_basis"],
        priority=params["priority"],
        discount_percent=params["discount_percent"],
        monthly_limit_usd=Decimal(str(data.monthly_limit_usd)) if data.monthly_limit_usd else None,
        monthly_used_usd=Decimal("0.00"),
        is_active=True,
        usage_weight=0
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    
    # Determine margin message
    if data.account_type == "discounted":
        margin_msg = "Высокая маржа (166%) - покупаем за 30%, продаём за 80%"
    else:
        margin_msg = "Низкая маржа (5%) - покупаем за 100%, продаём за 105% (резерв)"
    
    return {
        "id": str(account.id),
        "name": account.name,
        "account_type": account.account_type,
        "balance_usd": float(account.balance_usd),
        "markup_percent": account.markup_percent,
        "cost_basis": float(account.cost_basis),
        "priority": account.priority,
        "is_active": account.is_active,
        "message": f"Master account created successfully. {margin_msg}"
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


def generate_temporary_password(length: int = 12) -> str:
    """Generate a secure temporary password"""
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.post("/users", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Create a new user by admin (generates temporary password)"""
    from app.core.security import get_password_hash
    
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate temporary password
    temp_password = generate_temporary_password()
    password_hash = get_password_hash(temp_password)
    
    # Create user
    user = User(
        id=uuid4(),
        email=data.email,
        name=data.name,
        password_hash=password_hash,
        role=data.role,
        status="active",
        email_verified=True,  # Auto-verified since admin created
        force_password_change=True  # User must change password on first login
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return UserCreateResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        temporary_password=temp_password,
        message="User created successfully. Temporary password shown only once!"
    )


class BalanceAddRequest(BaseModel):
    amount: float
    reason: str | None = None


class BalanceAddResponse(BaseModel):
    user_id: str
    email: str
    old_balance: float
    new_balance: float
    added_amount: float
    reason: str | None
    message: str


@router.post("/users/{user_id}/balance", response_model=BalanceAddResponse)
async def add_user_balance(
    user_id: str,
    data: BalanceAddRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Add balance to user account (admin only)"""
    from decimal import Decimal
    from app.models import Balance, Deposit
    
    # Find user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be positive"
        )
    
    # Get or create balance
    result = await db.execute(select(Balance).where(Balance.user_id == user_id))
    balance = result.scalar_one_or_none()
    
    old_balance = float(balance.balance_usd) if balance else 0.0
    
    if not balance:
        balance = Balance(
            user_id=user_id,
            balance_usd=Decimal(str(data.amount)),
            lifetime_earned=Decimal(str(data.amount))
        )
        db.add(balance)
    else:
        balance.balance_usd += Decimal(str(data.amount))
        balance.lifetime_earned += Decimal(str(data.amount))
        balance.last_deposit_at = datetime.utcnow()
    
    # Create deposit record
    deposit = Deposit(
        user_id=user_id,
        amount_usd=Decimal(str(data.amount)),
        currency="USD",
        status="completed",
        payment_method="manual",
        provider_transaction_id=f"manual_{datetime.utcnow().timestamp()}",
        metadata_={"reason": data.reason, "added_by": str(admin.id)}
    )
    db.add(deposit)
    
    await db.commit()
    await db.refresh(balance)
    
    return BalanceAddResponse(
        user_id=user_id,
        email=user.email,
        old_balance=old_balance,
        new_balance=float(balance.balance_usd),
        added_amount=data.amount,
        reason=data.reason,
        message=f"Successfully added ${data.amount:.2f} to {user.email}"
    )


class DashboardResponse(BaseModel):
    master_accounts: list[dict]
    clients: list[dict]
    total_clients: int
    total_clients_balance: float
    total_deposits: float
    manual_deposits: float
    payment_deposits: float


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard statistics"""
    
    # Get master accounts
    result = await db.execute(select(MasterAccount).where(MasterAccount.is_active == True))
    master_accounts = result.scalars().all()
    
    master_list = [
        {
            "id": str(acc.id),
            "name": acc.name,
            "balance_usd": float(acc.balance_usd),
            "discount_percent": acc.discount_percent,
            "monthly_limit_usd": float(acc.monthly_limit_usd) if acc.monthly_limit_usd else None,
            "monthly_used_usd": float(acc.monthly_used_usd) if acc.monthly_used_usd else 0.0
        }
        for acc in master_accounts
    ]
    
    # Get clients with balance
    result = await db.execute(
        select(User, Balance).outerjoin(Balance, User.id == Balance.user_id)
        .where(User.role == "client")
    )
    clients_data = result.all()
    
    clients_list = []
    total_clients_balance = 0.0
    
    for user, balance in clients_data:
        balance_usd = float(balance.balance_usd) if balance else 0.0
        total_clients_balance += balance_usd
        
        clients_list.append({
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "balance_usd": balance_usd,
            "status": user.status,
            "created_at": user.created_at.isoformat() if user.created_at else None
        })
    
    # Get deposit statistics
    
    result = await db.execute(
        select(func.sum(Deposit.amount_usd)).where(Deposit.status == "completed")
    )
    total_deposits = float(result.scalar() or 0.0)
    
    result = await db.execute(
        select(func.sum(Deposit.amount_usd))
        .where(Deposit.status == "completed")
        .where(Deposit.payment_method == "manual")
    )
    manual_deposits = float(result.scalar() or 0.0)
    
    result = await db.execute(
        select(func.sum(Deposit.amount_usd))
        .where(Deposit.status == "completed")
        .where(Deposit.payment_method != "manual")
    )
    payment_deposits = float(result.scalar() or 0.0)
    
    return DashboardResponse(
        master_accounts=master_list,
        clients=clients_list,
        total_clients=len(clients_list),
        total_clients_balance=total_clients_balance,
        total_deposits=total_deposits,
        manual_deposits=manual_deposits,
        payment_deposits=payment_deposits
    )


@router.get("/master-accounts/pools")
async def get_master_account_pools(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get master account pool statistics for monitoring"""
    from app.services.master_selector import MasterAccountSelector
    
    selector = MasterAccountSelector(db)
    stats = await selector.get_pool_stats()
    alerts = await selector.check_low_balance_alerts()
    
    return {
        "pools": stats,
        "alerts": alerts,
        "recommendations": [
            "Пополняйте дисконтные аккаунты при балансе < $50 для сохранения высокой маржи",
            "Обычные аккаунты используются только как резерв",
            "Приоритет: дисконтные (маржа 166%) → обычные (маржа 5%)"
        ]
    }
