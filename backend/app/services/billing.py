from decimal import Decimal
from typing import Dict, Optional
from datetime import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models import RequestLog, Balance, ModelPricing
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Markup configuration (80% of real price means 25% markup on our cost)
CLIENT_PRICE_MULTIPLIER = Decimal("0.80")  # Client pays 80% of OpenRouter price
OUR_COST_MULTIPLIER = Decimal("0.30")      # We pay 30% of OpenRouter price (70% discount)


class BillingService:
    """Service for calculating and processing billing"""
    
    @staticmethod
    def calculate_cost(
        model_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        pricing: Optional[ModelPricing] = None
    ) -> Dict[str, Decimal]:
        """
        Calculate costs for a request
        
        Returns:
            {
                "real_cost_usd": Decimal,      # What OpenRouter charges (100%)
                "our_cost_usd": Decimal,       # What we pay (30%)
                "client_cost_usd": Decimal,    # What client pays (80%)
                "profit_usd": Decimal          # Our margin (50%)
            }
        """
        if pricing is None:
            # Default pricing if not found
            prompt_price = Decimal("0.000005")  # $5 per million tokens
            completion_price = Decimal("0.000015")  # $15 per million tokens
        else:
            prompt_price = Decimal(str(pricing.prompt_price))
            completion_price = Decimal(str(pricing.completion_price))
        
        # Calculate real cost (what OpenRouter charges)
        prompt_cost = (Decimal(prompt_tokens) / 1000) * prompt_price
        completion_cost = (Decimal(completion_tokens) / 1000) * completion_price
        real_cost = prompt_cost + completion_cost
        
        # Calculate our costs and client price
        our_cost = real_cost * OUR_COST_MULTIPLIER
        client_cost = real_cost * CLIENT_PRICE_MULTIPLIER
        profit = client_cost - our_cost
        
        return {
            "real_cost_usd": real_cost,
            "our_cost_usd": our_cost,
            "client_cost_usd": client_cost,
            "profit_usd": profit
        }
    
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
        # Atomic update with WHERE clause - ensures sufficient balance
        result = await db.execute(
            update(Balance)
            .where(
                Balance.user_id == user_id,
                Balance.balance_usd >= amount  # Prevents negative balance
            )
            .values(
                balance_usd=Balance.balance_usd - amount,
                lifetime_spent=Balance.lifetime_spent + amount,
                updated_at=datetime.utcnow()
            )
        )
        await db.commit()
        
        # Check if row was actually updated
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
        # Try to deduct (reserve) the amount atomically
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
            # Create new balance record
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
        error_message: Optional[str] = None
    ) -> RequestLog:
        """Log request to database"""
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
            error_message=error_message
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
        
        return {
            "period": f"{days}d",
            "total_requests": stats.total_requests or 0,
            "total_tokens": stats.total_tokens or 0,
            "total_cost_usd": float(stats.total_cost or 0),
            "total_profit_usd": float(stats.total_profit or 0),
            "by_model": [
                {"model": m.model, "requests": m.requests, "cost_usd": float(m.cost)}
                for m in models
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
