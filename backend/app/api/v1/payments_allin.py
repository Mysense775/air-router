"""
AllIn Payment API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
from datetime import datetime
import logging

from app.db.session import get_db
from app.models import User, Deposit, Balance
from app.api.v1.auth import get_current_active_user
from app.services.allin import allin_service
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


@router.post("/allin/create")
async def create_allin_payment(
    amount: float,
    currency: str = "RUB",
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create AllIn payment transaction
    """
    try:
        # Generate unique order ID
        order_id = f"ALLIN-{current_user.id}-{int(datetime.utcnow().timestamp())}"
        
        # Create payment in AllIn
        result = await allin_service.create_payment(
            order_id=order_id,
            amount=Decimal(str(amount)),
            currency=currency,
            description=f"Deposit for {current_user.email}",
            webhook_url=f"{settings.SITE_URL}/v1/payments/allin/webhook",
            success_url=f"{settings.SITE_URL}/deposit/success",
            cancel_url=f"{settings.SITE_URL}/deposit/cancel",
            email=current_user.email,
            test_mode=(settings.ENVIRONMENT != "production")
        )
        
        # Create pending deposit record
        deposit = Deposit(
            user_id=current_user.id,
            amount_usd=Decimal(str(amount)),  # Convert if needed
            amount_original=Decimal(str(amount)),
            currency=currency,
            payment_method="allin",
            payment_provider="allin",
            provider_transaction_id=result.get("transactionId") or result.get("id"),
            status="pending",
            metadata=result
        )
        db.add(deposit)
        await db.commit()
        
        return {
            "status": "success",
            "payment_url": result.get("paymentUrl") or result.get("url"),
            "order_id": order_id,
            "amount": amount,
            "currency": currency
        }
        
    except Exception as e:
        logger.error(f"Failed to create AllIn payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment creation failed: {str(e)}"
        )


@router.post("/allin/webhook")
async def allin_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle AllIn payment webhook
    """
    try:
        # Get raw body for signature verification
        body = await request.body()
        payload = await request.json()
        
        # TODO: Verify signature if AllIn sends it
        # signature = request.headers.get("X-Signature")
        # if not await allin_service.verify_webhook_signature(body, signature, settings.ALLIN_WEBHOOK_SECRET):
        #     raise HTTPException(status_code=400, detail="Invalid signature")
        
        order_id = payload.get("orderId")
        status = payload.get("status")
        transaction_id = payload.get("transactionId") or payload.get("id")
        
        logger.info(f"AllIn webhook: order_id={order_id}, status={status}")
        
        # Find deposit by order ID or transaction ID
        result = await db.execute(
            select(Deposit).where(
                (Deposit.provider_transaction_id == transaction_id) |
                (Deposit.metadata.contains({"orderId": order_id}))
            )
        )
        deposit = result.scalar_one_or_none()
        
        if not deposit:
            logger.warning(f"Deposit not found: order_id={order_id}")
            return {"status": "not_found"}
        
        # Update deposit status
        if status in ["completed", "success", "paid"]:
            deposit.status = "completed"
            deposit.completed_at = datetime.utcnow()
            
            # Update user balance
            result = await db.execute(
                select(Balance).where(Balance.user_id == deposit.user_id)
            )
            balance = result.scalar_one_or_none()
            if balance:
                balance.balance_usd += deposit.amount_usd
                balance.last_deposit_at = datetime.utcnow()
                
        elif status in ["failed", "cancelled", "expired"]:
            deposit.status = "failed"
        else:
            deposit.status = status
        
        await db.commit()
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/allin/info/{transaction_id}")
async def get_allin_transaction_info(
    transaction_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed AllIn transaction info by transaction ID
    """
    try:
        info = await allin_service.get_transaction_info(transaction_id)
        
        return {
            "transaction_id": transaction_id,
            "info": info
        }
    except Exception as e:
        logger.error(f"Failed to get AllIn transaction info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get transaction info: {str(e)}"
        )


@router.get("/allin/status/{order_id}")
async def check_allin_status(
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Check AllIn payment status by order ID
    """
    # Find deposit in database
    result = await db.execute(
        select(Deposit).where(
            Deposit.metadata.contains({"orderId": order_id}),
            Deposit.user_id == current_user.id
        )
    )
    deposit = result.scalar_one_or_none()
    
    if not deposit:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If we have transaction ID, check actual status from AllIn
    if deposit.provider_transaction_id:
        try:
            allin_status = await allin_service.check_status(deposit.provider_transaction_id)
            
            # Update local status if changed
            new_status = allin_status.get("status", "").lower()
            if new_status in ["completed", "success", "paid"] and deposit.status != "completed":
                deposit.status = "completed"
                deposit.completed_at = datetime.utcnow()
                
                # Update balance
                result = await db.execute(
                    select(Balance).where(Balance.user_id == deposit.user_id)
                )
                balance = result.scalar_one_or_none()
                if balance:
                    balance.balance_usd += deposit.amount_usd
                    balance.last_deposit_at = datetime.utcnow()
                
                await db.commit()
            elif new_status in ["failed", "cancelled", "expired"]:
                deposit.status = "failed"
                await db.commit()
            
            return {
                "order_id": order_id,
                "transaction_id": deposit.provider_transaction_id,
                "status": deposit.status,
                "allin_status": new_status,
                "amount": str(deposit.amount_usd),
                "currency": deposit.currency,
                "created_at": deposit.created_at.isoformat() if deposit.created_at else None,
                "completed_at": deposit.completed_at.isoformat() if deposit.completed_at else None
            }
        except Exception as e:
            logger.error(f"Failed to check AllIn status: {e}")
    
    # Return local status if can't check with AllIn
    return {
        "order_id": order_id,
        "transaction_id": deposit.provider_transaction_id,
        "status": deposit.status,
        "amount": str(deposit.amount_usd),
        "currency": deposit.currency,
        "created_at": deposit.created_at.isoformat() if deposit.created_at else None
    }
