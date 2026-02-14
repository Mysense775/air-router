"""
Cryptocurrency payment integration using NowPayments
Supports USDT, USDC, BTC, ETH
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, timedelta
import httpx
import hashlib
import hmac
import logging

from app.db.session import get_db
from app.models import User, Deposit, Balance
from app.api.v1.auth import get_current_active_user
from app.core.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

# NowPayments API configuration
NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1"
NOWPAYMENTS_SANDBOX_URL = "https://api-sandbox.nowpayments.io/v1"

class CreatePaymentRequest(BaseModel):
    amount_usd: float
    currency: str = "usdttrc20"  # Default: USDT TRC-20 (low fees)
    
class CreatePaymentResponse(BaseModel):
    payment_id: str
    pay_address: str
    pay_amount: float
    pay_currency: str
    expiration_at: datetime
    payment_url: str | None

class PaymentStatusResponse(BaseModel):
    payment_id: str
    status: str  # waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired
    pay_address: str
    pay_amount: float
    actually_paid: float
    created_at: datetime
    updated_at: datetime

async def get_nowpayments_api_key() -> str:
    """Get NowPayments API key from settings"""
    # In production, load from environment or database
    settings = get_settings()
    return getattr(settings, 'NOWPAYMENTS_API_KEY', '')

async def create_crypto_payment(
    user_id: str,
    amount_usd: float,
    currency: str = "usdttrc20",
    db: AsyncSession = None
) -> dict:
    """Create new crypto payment via NowPayments"""
    
    settings = get_settings()
    api_key = await get_nowpayments_api_key()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment gateway not configured"
        )
    
    # Get user email for payment description
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Create payment in NowPayments
    async with httpx.AsyncClient() as client:
        try:
            # First, get estimated price
            price_response = await client.get(
                f"{NOWPAYMENTS_API_URL}/estimate",
                headers={"x-api-key": api_key},
                params={
                    "amount": amount_usd,
                    "currency_from": "usd",
                    "currency_to": currency
                }
            )
            
            if price_response.status_code != 200:
                logger.error(f"NowPayments price error: {price_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to get exchange rate"
                )
            
            price_data = price_response.json()
            expected_amount = price_data.get("estimated_amount", 0)
            
            # Create payment
            payment_response = await client.post(
                f"{NOWPAYMENTS_API_URL}/payment",
                headers={
                    "x-api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "price_amount": amount_usd,
                    "price_currency": "usd",
                    "pay_currency": currency,
                    "ipn_callback_url": f"{settings.API_BASE_URL}/v1/payments/webhook",
                    "order_id": f"deposit_{user_id}_{int(datetime.utcnow().timestamp())}",
                    "order_description": f"AI Router Balance Deposit - {user.email}",
                    "case": "success"
                }
            )
            
            if payment_response.status_code not in [200, 201]:
                logger.error(f"NowPayments create error: {payment_response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to create payment"
                )
            
            payment_data = payment_response.json()
            
            # Create deposit record
            deposit = Deposit(
                user_id=user_id,
                amount_usd=Decimal(str(amount_usd)),
                currency="USD",
                payment_method="crypto",
                payment_provider="nowpayments",
                provider_transaction_id=str(payment_data.get("payment_id")),
                status="pending",
                metadata_={
                    "pay_address": payment_data.get("pay_address"),
                    "pay_amount": payment_data.get("pay_amount"),
                    "pay_currency": currency,
                    "expected_amount": expected_amount
                }
            )
            db.add(deposit)
            await db.commit()
            await db.refresh(deposit)
            
            return {
                "payment_id": payment_data.get("payment_id"),
                "pay_address": payment_data.get("pay_address"),
                "pay_amount": float(payment_data.get("pay_amount", 0)),
                "pay_currency": currency,
                "expiration_at": datetime.utcnow() + timedelta(hours=24),
                "payment_url": payment_data.get("payment_url")
            }
            
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Payment gateway timeout"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Payment creation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create payment"
            )

@router.post("/create", response_model=CreatePaymentResponse)
async def create_payment(
    data: CreatePaymentRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new crypto payment"""
    
    if data.amount_usd < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum deposit amount is $5"
        )
    
    if data.amount_usd > 10000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum deposit amount is $10,000"
        )
    
    result = await create_crypto_payment(
        user_id=str(current_user.id),
        amount_usd=data.amount_usd,
        currency=data.currency,
        db=db
    )
    
    return CreatePaymentResponse(**result)

@router.get("/status/{payment_id}", response_model=PaymentStatusResponse)
async def check_payment_status(
    payment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Check payment status"""
    
    # Verify payment belongs to user
    result = await db.execute(
        select(Deposit).where(
            Deposit.provider_transaction_id == payment_id,
            Deposit.user_id == str(current_user.id)
        )
    )
    deposit = result.scalar_one_or_none()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    # Get status from NowPayments
    api_key = await get_nowpayments_api_key()
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{NOWPAYMENTS_API_URL}/payment/{payment_id}",
                headers={"x-api-key": api_key}
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to get payment status"
                )
            
            data = response.json()
            
            # Update local status if changed
            new_status = data.get("payment_status", "waiting")
            if new_status != deposit.status and new_status in ["confirmed", "finished"]:
                deposit.status = "completed"
                deposit.completed_at = datetime.utcnow()
                
                # Add to balance
                result = await db.execute(
                    select(Balance).where(Balance.user_id == str(current_user.id))
                )
                balance = result.scalar_one_or_none()
                
                if not balance:
                    balance = Balance(
                        user_id=str(current_user.id),
                        balance_usd=deposit.amount_usd,
                        lifetime_earned=deposit.amount_usd
                    )
                    db.add(balance)
                else:
                    balance.balance_usd += deposit.amount_usd
                    balance.lifetime_earned += deposit.amount_usd
                
                await db.commit()
            elif new_status in ["failed", "expired", "refunded"]:
                deposit.status = new_status
                await db.commit()
            
            return PaymentStatusResponse(
                payment_id=payment_id,
                status=new_status,
                pay_address=data.get("pay_address", ""),
                pay_amount=float(data.get("pay_amount", 0)),
                actually_paid=float(data.get("actually_paid", 0)),
                created_at=datetime.fromisoformat(data.get("created_at", "").replace('Z', '+00:00')),
                updated_at=datetime.fromisoformat(data.get("updated_at", "").replace('Z', '+00:00'))
            )
            
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Payment gateway timeout"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check payment status"
            )

@router.post("/webhook")
async def payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle NowPayments webhook"""
    
    try:
        payload = await request.json()
        logger.info(f"Received webhook: {payload}")
        
        payment_id = payload.get("payment_id")
        status = payload.get("payment_status")
        order_id = payload.get("order_id")
        
        if not payment_id or not status:
            return {"status": "ignored", "reason": "missing data"}
        
        # Find deposit
        result = await db.execute(
            select(Deposit).where(Deposit.provider_transaction_id == str(payment_id))
        )
        deposit = result.scalar_one_or_none()
        
        if not deposit:
            logger.warning(f"Webhook for unknown payment: {payment_id}")
            return {"status": "ignored", "reason": "payment not found"}
        
        # Update status
        if status in ["confirmed", "finished"] and deposit.status != "completed":
            deposit.status = "completed"
            deposit.completed_at = datetime.utcnow()
            
            # Add to user balance
            result = await db.execute(
                select(Balance).where(Balance.user_id == deposit.user_id)
            )
            balance = result.scalar_one_or_none()
            
            if not balance:
                balance = Balance(
                    user_id=deposit.user_id,
                    balance_usd=deposit.amount_usd,
                    lifetime_earned=deposit.amount_usd
                )
                db.add(balance)
            else:
                balance.balance_usd += deposit.amount_usd
                balance.lifetime_earned += deposit.amount_usd
            
            await db.commit()
            logger.info(f"Payment {payment_id} completed, balance updated")
            
        elif status in ["failed", "expired"]:
            deposit.status = status
            await db.commit()
            logger.info(f"Payment {payment_id} marked as {status}")
        
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        # Return 200 to prevent retries on unrecoverable errors
        return {"status": "error", "message": str(e)}

@router.get("/history")
async def get_payment_history(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0
):
    """Get user's payment history"""
    
    result = await db.execute(
        select(Deposit)
        .where(Deposit.user_id == str(current_user.id))
        .where(Deposit.payment_method == "crypto")
        .order_by(Deposit.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    deposits = result.scalars().all()
    
    return {
        "payments": [
            {
                "id": str(d.id),
                "amount_usd": float(d.amount_usd),
                "status": d.status,
                "currency": d.currency,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "completed_at": d.completed_at.isoformat() if d.completed_at else None,
                "metadata": d.metadata_
            }
            for d in deposits
        ]
    }

@router.get("/currencies")
async def get_supported_currencies():
    """Get list of supported cryptocurrencies"""
    return {
        "currencies": [
            {"code": "usdttrc20", "name": "USDT (TRC-20)", "network": "Tron", "fee": "low"},
            {"code": "usdt", "name": "USDT (ERC-20)", "network": "Ethereum", "fee": "medium"},
            {"code": "usdc", "name": "USDC", "network": "Ethereum", "fee": "medium"},
            {"code": "btc", "name": "Bitcoin", "network": "Bitcoin", "fee": "variable"},
            {"code": "eth", "name": "Ethereum", "network": "Ethereum", "fee": "variable"},
            {"code": "sol", "name": "Solana", "network": "Solana", "fee": "low"},
        ]
    }
