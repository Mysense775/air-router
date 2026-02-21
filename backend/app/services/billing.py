from decimal import Decimal
from typing import Dict, Optional, Union, Tuple
from datetime import datetime, timedelta
import logging
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models import RequestLog, Balance, ModelPricing, MasterAccount, InvestorAccount
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
# Кэш цен актуален 1 час
PRICING_CACHE_TTL_HOURS = 1


# Account type configurations
ACCOUNT_CONFIG = {
    "discounted": {
        "cost_basis": Decimal("0.30"),      # We pay 30% of OpenRouter price
        "price_multiplier": Decimal("0.80"), # Client pays 80% (saves 20%)
        "markup_percent": Decimal("-20"),    # -20% discount for client
        "description": "High margin accounts with 70% discount from OpenRouter"
    },
    "regular": {
        "cost_basis": Decimal("1.00"),      # We pay 100% of OpenRouter price
        "price_multiplier": Decimal("1.10"), # Client pays 110% (+10% markup)
        "markup_percent": Decimal("10"),     # +10% markup
        "description": "Standard accounts with 10% markup"
    },
    "investor": {
        "cost_basis": Decimal("1.00"),      # We pay 100% (to investor)
        "price_multiplier": Decimal("1.10"), # Client pays 110% (+10% markup)
        "commission_rate": Decimal("0.01"),  # 1% commission to investor
        "markup_percent": Decimal("10"),     # +10% markup (but we give 1% to investor)
        "description": "Investor keys with 1% commission"
    }
}


class BillingService:
    """Service for calculating and processing billing with support for all account types"""
    
    @staticmethod
    def calculate_cost(
        model_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        pricing: Optional[ModelPricing] = None
    ) -> Dict[str, Decimal]:
        """
        Calculate base costs from OpenRouter pricing (without account type).
        
        This is used for initial cost estimation before selecting an account.
        For final billing with account type, use calculate_cost_with_account().
        
        Returns:
            {
                "real_cost_usd": Decimal,      # What OpenRouter charges (100%)
                "prompt_cost": Decimal,        # Cost for prompt tokens
                "completion_cost": Decimal     # Cost for completion tokens
            }
        """
        if pricing is None:
            # Default pricing per token (OpenRouter format)
            # gpt-4o-mini: prompt $0.15/1M = $0.00000015/token
            #              completion $0.60/1M = $0.0000006/token
            prompt_price_per_token = Decimal("0.00000015")
            completion_price_per_token = Decimal("0.0000006")
        else:
            # model_pricing stores price per token (OpenRouter format)
            prompt_price_per_token = Decimal(str(pricing.prompt_price))
            completion_price_per_token = Decimal(str(pricing.completion_price))
        
        # Calculate real cost (what OpenRouter charges)
        prompt_cost = Decimal(prompt_tokens) * prompt_price_per_token
        completion_cost = Decimal(completion_tokens) * completion_price_per_token
        real_cost = prompt_cost + completion_cost
        
        return {
            "real_cost_usd": real_cost,
            "prompt_cost": prompt_cost,
            "completion_cost": completion_cost
        }
    
    @staticmethod
    def calculate_cost_with_account(
        model_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        account: Union[MasterAccount, InvestorAccount],
        pricing: Optional[ModelPricing] = None
    ) -> Dict[str, Decimal]:
        """
        Calculate complete cost breakdown for a request with specific account.
        
        Supports three account types:
        - discounted: 30% cost, 80% client price, 166% margin
        - regular: 100% cost, 110% client price, 10% margin  
        - investor: 100% cost + 1% commission, 110% client price, ~9% margin
        
        Args:
            model_id: Model identifier (e.g., "openai/gpt-4o")
            prompt_tokens: Number of prompt tokens
            completion_tokens: Number of completion tokens
            account: MasterAccount or InvestorAccount instance
            pricing: Optional ModelPricing instance
            
        Returns:
            {
                "real_cost_usd": Decimal,          # OpenRouter price (100%)
                "our_cost_usd": Decimal,           # What we actually pay
                "client_cost_usd": Decimal,        # What client pays
                "profit_usd": Decimal,             # Our profit
                "commission_usd": Decimal,         # Commission to investor (if applicable)
                "savings_usd": Decimal,            # Client savings vs OpenRouter
                "account_type": str                # Type of account used
            }
        """
        # Get base cost from OpenRouter
        base = BillingService.calculate_cost(model_id, prompt_tokens, completion_tokens, pricing)
        real_cost = base["real_cost_usd"]
        
        # Determine account type and configuration
        if isinstance(account, InvestorAccount):
            account_type = "investor"
            config = ACCOUNT_CONFIG["investor"]
        else:
            account_type = account.account_type  # "discounted" or "regular"
            config = ACCOUNT_CONFIG.get(account_type, ACCOUNT_CONFIG["regular"])
        
        cost_basis = config["cost_basis"]
        price_multiplier = config["price_multiplier"]
        
        # Calculate our actual cost
        if account_type == "investor":
            # For investor accounts, we pay 100% to investor + 1% commission
            our_cost = real_cost * cost_basis
            commission = real_cost * config["commission_rate"]
            our_total_cost = our_cost + commission
        else:
            # For our own accounts (discounted/regular)
            our_cost = real_cost * cost_basis
            commission = Decimal("0")
            our_total_cost = our_cost
        
        # Calculate client cost
        client_cost = real_cost * price_multiplier
        
        # Calculate profit
        profit = client_cost - our_total_cost
        
        # Calculate client savings (positive if client pays less than OpenRouter)
        savings = real_cost - client_cost
        
        return {
            "real_cost_usd": real_cost,
            "our_cost_usd": our_total_cost,
            "our_base_cost_usd": our_cost,
            "client_cost_usd": client_cost,
            "profit_usd": profit,
            "commission_usd": commission,
            "savings_usd": savings,
            "account_type": account_type,
            "price_multiplier": price_multiplier,
            "cost_basis": cost_basis
        }
    
    @staticmethod
    def calculate_cost_from_openrouter_actual(
        openrouter_cost: Decimal,
        account: Union[MasterAccount, InvestorAccount]
    ) -> Dict[str, Decimal]:
        """
        Calculate client cost based on ACTUAL OpenRouter cost from usage.cost.
        
        This replaces token-based calculation and accounts for:
        - Image generation costs
        - Web search costs
        - Any other OpenRouter surcharges
        
        Args:
            openrouter_cost: The actual cost from OpenRouter (usage.cost)
            account: MasterAccount or InvestorAccount used for the request
            
        Returns:
            Cost breakdown with client pricing applied
        """
        # Determine account type and configuration
        if isinstance(account, InvestorAccount):
            account_type = "investor"
            config = ACCOUNT_CONFIG["investor"]
        else:
            account_type = account.account_type  # "discounted" or "regular"
            config = ACCOUNT_CONFIG.get(account_type, ACCOUNT_CONFIG["regular"])
        
        price_multiplier = config["price_multiplier"]
        cost_basis = config["cost_basis"]  # 0.30 for discounted, 1.00 for regular
        
        # Calculate client cost based on actual OpenRouter cost
        client_cost = openrouter_cost * price_multiplier
        
        if account_type == "investor":
            # For investor keys: we pay 100% to investor + 1% commission
            commission = openrouter_cost * config["commission_rate"]
            our_total_cost = openrouter_cost + commission
        else:
            # For our own accounts: we pay based on cost_basis
            # discounted: 30% of OpenRouter price
            # regular: 100% of OpenRouter price
            our_total_cost = openrouter_cost * cost_basis
            commission = Decimal("0")
        
        # Calculate profit
        profit = client_cost - our_total_cost
        
        # Calculate savings vs direct OpenRouter (if any)
        savings = openrouter_cost - client_cost  # Positive if client pays less
        
        return {
            "real_cost_usd": openrouter_cost,           # What OpenRouter charged
            "our_cost_usd": our_total_cost,             # What we actually pay
            "our_base_cost_usd": openrouter_cost,       # Base cost (same as real for actual)
            "client_cost_usd": client_cost,             # What client pays
            "profit_usd": profit,                       # Our profit
            "commission_usd": commission,               # Commission to investor
            "savings_usd": savings if savings > 0 else Decimal("0"),
            "account_type": account_type,
            "price_multiplier": price_multiplier,
            "cost_basis": Decimal("1.0"),  # We pay 100% of actual OpenRouter cost
            "calculation_method": "actual_openrouter_cost"  # Track that we used actual cost
        }
    
    @staticmethod
    def get_account_type_description(account_type: str) -> str:
        """Get human-readable description of account type"""
        config = ACCOUNT_CONFIG.get(account_type)
        if not config:
            return f"Unknown account type: {account_type}"
        
        if account_type == "discounted":
            return f"Discounted (-20% for client, 166% margin)"
        elif account_type == "regular":
            return f"Regular (+10% markup, 10% margin)"
        elif account_type == "investor":
            return f"Investor (+10% markup, ~9% margin after 1% commission)"
        return config["description"]
    
    @staticmethod
    async def check_balance(
        db: AsyncSession,
        user_id: str,
        estimated_cost: Decimal
    ) -> bool:
        """Check if user has sufficient balance"""
        result = await db.execute(
            select(Balance).where(Balance.user_id == user_id)
        )
        balance = result.scalar_one_or_none()
        
        if not balance:
            return False
        
        return Decimal(str(balance.balance_usd)) >= estimated_cost
    
    @staticmethod
    async def deduct_balance(
        db: AsyncSession,
        user_id: str,
        amount: Decimal
    ) -> bool:
        """Deduct amount from user balance atomically (prevents race conditions)"""
        result = await db.execute(
            update(Balance)
            .where(
                Balance.user_id == user_id,
                Balance.balance_usd >= amount
            )
            .values(
                balance_usd=Balance.balance_usd - amount,
                lifetime_spent=Balance.lifetime_spent + amount,
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()
        
        return result.rowcount > 0
    
    @staticmethod
    async def reserve_balance(
        db: AsyncSession,
        user_id: str,
        amount: Decimal
    ) -> bool:
        """
        Reserve balance before making upstream request.
        Returns True if reservation successful.
        """
        result = await db.execute(
            update(Balance)
            .where(
                Balance.user_id == user_id,
                Balance.balance_usd >= amount
            )
            .values(
                balance_usd=Balance.balance_usd - amount,
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()
        
        if result.rowcount == 0:
            logger.warning(f"Balance reservation failed for user {user_id}: insufficient funds")
            return False
        
        logger.info(f"Reserved {amount} USD for user {user_id}")
        return True
    
    @staticmethod
    async def release_balance(
        db: AsyncSession,
        user_id: str,
        amount: Decimal
    ) -> bool:
        """
        Release reserved balance (refund unused amount).
        Called when actual cost is less than reserved or on error.
        """
        result = await db.execute(
            update(Balance)
            .where(Balance.user_id == user_id)
            .values(
                balance_usd=Balance.balance_usd + amount,
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()
        
        if result.rowcount > 0:
            logger.info(f"Released {amount} USD to user {user_id}")
            return True
        return False
    
    @staticmethod
    async def add_balance(
        db: AsyncSession,
        user_id: str,
        amount: Decimal
    ) -> bool:
        """Add amount to user balance (for deposits)"""
        result = await db.execute(
            select(Balance).where(Balance.user_id == user_id)
        )
        balance = result.scalar_one_or_none()
        
        if not balance:
            balance = Balance(
                user_id=user_id,
                balance_usd=amount,
                lifetime_spent=Decimal("0.00"),
                lifetime_earned=amount
            )
            db.add(balance)
        else:
            current_balance = Decimal(str(balance.balance_usd))
            new_balance = current_balance + amount
            
            await db.execute(
                update(Balance)
                .where(Balance.user_id == user_id)
                .values(
                    balance_usd=new_balance,
                    lifetime_earned=Decimal(str(balance.lifetime_earned)) + amount
                )
            )
        
        await db.commit()
        return True
    
    @staticmethod
    async def log_request(
        db: AsyncSession,
        user_id: str,
        api_key_id: Optional[str],
        master_account_id: Optional[str],
        model: str,
        endpoint: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_breakdown: Dict[str, Decimal],
        duration_ms: int,
        status: str,
        status_code: Optional[int] = None,
        error_message: Optional[str] = None,
        account_type_used: Optional[str] = None
    ) -> RequestLog:
        """Log request to database with account type information"""
        log = RequestLog(
            user_id=user_id,
            api_key_id=api_key_id,
            master_account_id=master_account_id,
            model=model,
            endpoint=endpoint,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost_to_us_usd=cost_breakdown["our_cost_usd"],
            cost_to_client_usd=cost_breakdown["client_cost_usd"],
            openrouter_cost_usd=cost_breakdown.get("real_cost_usd", cost_breakdown["our_cost_usd"]),
            profit_usd=cost_breakdown["profit_usd"],
            duration_ms=duration_ms,
            status=status,
            status_code=status_code,
            error_message=error_message,
            account_type_used=account_type_used or cost_breakdown.get("account_type")
        )
        
        db.add(log)
        await db.commit()
        await db.refresh(log)
        
        return log
    
    @staticmethod
    async def get_user_stats(
        db: AsyncSession,
        user_id: str,
        days: int = 7
    ) -> Dict:
        """Get usage statistics for user"""
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get total requests and cost
        result = await db.execute(
            select(
                func.count(RequestLog.id).label("total_requests"),
                func.sum(RequestLog.total_tokens).label("total_tokens"),
                func.sum(RequestLog.cost_to_client_usd).label("total_cost"),
                func.sum(RequestLog.profit_usd).label("total_profit")
            )
            .where(RequestLog.user_id == user_id)
            .where(RequestLog.created_at >= start_date)
        )
        stats = result.one()
        
        # Get requests by model
        model_result = await db.execute(
            select(
                RequestLog.model,
                func.count(RequestLog.id).label("requests"),
                func.sum(RequestLog.cost_to_client_usd).label("cost")
            )
            .where(RequestLog.user_id == user_id)
            .where(RequestLog.created_at >= start_date)
            .group_by(RequestLog.model)
            .order_by(func.count(RequestLog.id).desc())
        )
        models = model_result.all()
        
        # Get requests by account type
        account_type_result = await db.execute(
            select(
                RequestLog.account_type_used,
                func.count(RequestLog.id).label("requests"),
                func.sum(RequestLog.cost_to_client_usd).label("cost"),
                func.sum(RequestLog.profit_usd).label("profit")
            )
            .where(RequestLog.user_id == user_id)
            .where(RequestLog.created_at >= start_date)
            .where(RequestLog.account_type_used.isnot(None))
            .group_by(RequestLog.account_type_used)
        )
        by_account_type = account_type_result.all()
        
        return {
            "period": f"{days}d",
            "total_requests": stats.total_requests or 0,
            "total_tokens": stats.total_tokens or 0,
            "total_cost_usd": float(stats.total_cost or 0),
            "total_profit_usd": float(stats.total_profit or 0),
            "by_model": [
                {"model": m.model, "requests": m.requests, "cost_usd": float(m.cost)}
                for m in models
            ],
            "by_account_type": [
                {
                    "type": at.account_type_used,
                    "requests": at.requests,
                    "cost_usd": float(at.cost),
                    "profit_usd": float(at.profit)
                }
                for at in by_account_type
            ]
        }


class PricingService:
    """Service for managing model pricing"""
    
    @staticmethod
    async def get_model_pricing(
        db: AsyncSession,
        model_id: str
    ) -> Optional[ModelPricing]:
        """Get pricing for a specific model"""
        result = await db.execute(
            select(ModelPricing).where(ModelPricing.id == model_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_model_pricing(
        db: AsyncSession,
        model_id: str,
        provider: str,
        prompt_price: float,
        completion_price: float,
        context_length: Optional[int] = None,
        display_name: Optional[str] = None
    ) -> ModelPricing:
        """Update or create model pricing"""
        result = await db.execute(
            select(ModelPricing).where(ModelPricing.id == model_id)
        )
        pricing = result.scalar_one_or_none()
        
        if pricing:
            pricing.prompt_price = prompt_price
            pricing.completion_price = completion_price
            if context_length:
                pricing.context_length = context_length
            if display_name:
                pricing.display_name = display_name
            pricing.fetched_at = datetime.utcnow()
        else:
            pricing = ModelPricing(
                id=model_id,
                provider=provider,
                prompt_price=prompt_price,
                completion_price=completion_price,
                context_length=context_length,
                display_name=display_name or model_id,
                is_active=True,
                fetched_at=datetime.utcnow()
            )
            db.add(pricing)
        
        await db.commit()
        await db.refresh(pricing)
        return pricing
    
    @staticmethod
    async def get_all_active_models(
        db: AsyncSession
    ) -> list[ModelPricing]:
        """Get all active models with pricing"""
        result = await db.execute(
            select(ModelPricing)
            .where(ModelPricing.is_active == True)
            .order_by(ModelPricing.provider, ModelPricing.id)
        )
        return result.scalars().all()
    
    @staticmethod
    def estimate_cost_for_all_account_types(
        model_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        pricing: Optional[ModelPricing] = None
    ) -> Dict[str, Dict[str, Decimal]]:
        """
        Estimate cost for all account types (for comparison/UI display).
        
        Returns cost breakdown for each account type without requiring DB access.
        """
        base = BillingService.calculate_cost(model_id, prompt_tokens, completion_tokens, pricing)
        real_cost = base["real_cost_usd"]
        
        estimates = {}
        for account_type, config in ACCOUNT_CONFIG.items():
            cost_basis = config["cost_basis"]
            price_multiplier = config["price_multiplier"]
            
            if account_type == "investor":
                our_cost = real_cost * cost_basis
                commission = real_cost * config["commission_rate"]
                our_total = our_cost + commission
            else:
                our_cost = real_cost * cost_basis
                commission = Decimal("0")
                our_total = our_cost
            
            client_cost = real_cost * price_multiplier
            profit = client_cost - our_total
            savings = real_cost - client_cost
            
            estimates[account_type] = {
                "client_cost": client_cost,
                "our_cost": our_total,
                "profit": profit,
                "savings": savings,
                "commission": commission,
                "description": config["description"]
            }
        
        return estimates
    
    @staticmethod
    async def fetch_model_from_openrouter(model_id: str) -> Optional[Dict]:
        """
        Fetch pricing for a specific model from OpenRouter API.
        
        Args:
            model_id: Model identifier (e.g., "openai/gpt-4o")
            
        Returns:
            Dict with model data or None if not found
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(OPENROUTER_MODELS_URL)
                response.raise_for_status()
                data = response.json()
                
                for model in data.get("data", []):
                    if model.get("id") == model_id:
                        return model
                        
                logger.warning(f"Model {model_id} not found in OpenRouter API")
                return None
                
        except Exception as e:
            logger.error(f"Failed to fetch pricing from OpenRouter: {e}")
            return None
    
    @staticmethod
    async def get_or_fetch_model_pricing(
        db: AsyncSession,
        model_id: str,
        max_age_hours: int = PRICING_CACHE_TTL_HOURS
    ) -> Tuple[Optional[ModelPricing], bool]:
        """
        ЛЕНИВАЯ ЗАГРУЗКА: Получает цену модели из кэша или OpenRouter.
        
        Алгоритм:
        1. Ищем в БД
        2. Если свежее max_age_hours — возвращаем из БД
        3. Если старое/отсутствует — запрашиваем у OpenRouter
        4. Если OpenRouter недоступен — возвращаем старое/None
        
        Args:
            db: Database session
            model_id: Model identifier
            max_age_hours: Максимальный возраст цены из кэша (по умолчанию 1 час)
            
        Returns:
            Tuple[ModelPricing, bool]: (pricing object, was_fetched_from_api)
            was_fetched_from_api = True если получено свежее с API, False если из кэша
        """
        from datetime import timezone
        now = datetime.now(timezone.utc)
        max_age = timedelta(hours=max_age_hours)
        
        # 1. Проверяем кэш
        result = await db.execute(
            select(ModelPricing).where(ModelPricing.id == model_id)
        )
        cached = result.scalar_one_or_none()
        
        # 2. Если свежее — используем
        if cached and cached.fetched_at:
            # Ensure both datetimes are timezone-aware
            fetched_at = cached.fetched_at
            if fetched_at.tzinfo is None:
                fetched_at = fetched_at.replace(tzinfo=timezone.utc)
            if (now - fetched_at) < max_age:
                logger.debug(f"Using cached pricing for {model_id} (age: {now - fetched_at})")
                return cached, False
        
        # 3. Нужно обновить — идём в OpenRouter
        logger.info(f"Fetching fresh pricing for {model_id} from OpenRouter...")
        fresh_data = await PricingService.fetch_model_from_openrouter(model_id)
        
        if not fresh_data:
            # OpenRouter недоступен или модель не найдена
            if cached:
                logger.warning(f"OpenRouter unavailable, using stale pricing for {model_id}")
                return cached, False  # Лучше старое, чем ничего
            else:
                logger.error(f"No pricing available for {model_id}")
                return None, False
        
        # 4. Парсим и сохраняем
        pricing_data = fresh_data.get("pricing", {})
        prompt_price_str = pricing_data.get("prompt", "0")
        completion_price_str = pricing_data.get("completion", "0")
        
        try:
            prompt_price = float(prompt_price_str) if prompt_price_str else 0.0
            completion_price = float(completion_price_str) if completion_price_str else 0.0
        except (ValueError, TypeError):
            logger.error(f"Invalid pricing data for {model_id}: {pricing_data}")
            if cached:
                return cached, False
            return None, False
        
        provider = model_id.split("/")[0] if "/" in model_id else "unknown"
        display_name = fresh_data.get("name", model_id)
        context_length = fresh_data.get("context_length")
        
        # 5. Обновляем или создаём запись
        if cached:
            cached.prompt_price = prompt_price
            cached.completion_price = completion_price
            cached.display_name = display_name
            cached.context_length = context_length
            cached.is_active = True
            cached.fetched_at = now
            await db.commit()
            await db.refresh(cached)
            logger.info(f"Updated pricing for {model_id}: prompt=${prompt_price}, completion=${completion_price}")
            return cached, True
        else:
            new_pricing = ModelPricing(
                id=model_id,
                provider=provider,
                display_name=display_name,
                prompt_price=prompt_price,
                completion_price=completion_price,
                context_length=context_length,
                is_active=True,
                fetched_at=now
            )
            db.add(new_pricing)
            await db.commit()
            await db.refresh(new_pricing)
            logger.info(f"Created new pricing for {model_id}: prompt=${prompt_price}, completion=${completion_price}")
            return new_pricing, True
    
    @staticmethod
    def is_pricing_fresh(pricing: Optional[ModelPricing], max_age_hours: int = PRICING_CACHE_TTL_HOURS) -> bool:
        """Check if pricing is fresh (not older than max_age_hours)"""
        if not pricing or not pricing.fetched_at:
            return False
        age = datetime.utcnow() - pricing.fetched_at
        return age < timedelta(hours=max_age_hours)
