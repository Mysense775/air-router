"""
AllIn Payment API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal
from datetime import datetime
import logging
import json

from app.db.session import get_db
from app.models import User, Deposit, Balance
from app.api.v1.auth import get_current_active_user
from app.services.allin import allin_service
from app.services.exchange import exchange_service
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


from pydantic import BaseModel

class CreatePaymentRequest(BaseModel):
    amount: float
    currency: str = "RUB"

@router.post("/allin/create")
async def create_allin_payment(
    request: CreatePaymentRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create AllIn payment transaction
    User sends amount in RUB, we convert to USD for internal accounting
    """
    try:
        # Get current exchange rate
        exchange_rate = await exchange_service.get_usd_rate()
        
        # Convert RUB to USD
        rub_amount = Decimal(str(request.amount))
        usd_amount = await exchange_service.rub_to_usd(rub_amount)
        
        logger.info(f"AllIn payment: {rub_amount} RUB -> {usd_amount} USD (rate: {exchange_rate})")
        
        # Generate unique order ID
        order_id = f"ALLIN-{current_user.id}-{int(datetime.utcnow().timestamp())}"
        
        # Create payment in AllIn (amount in RUB)
        result = await allin_service.create_payment(
            order_id=order_id,
            amount=rub_amount,
            currency=request.currency,
            description=f"Deposit for {current_user.email}",
            webhook_url=f"{settings.SITE_URL}/v1/payments/allin/webhook",
            success_url=f"{settings.SITE_URL}/deposit/success",
            cancel_url=f"{settings.SITE_URL}/deposit/cancel",
            email=current_user.email,
            test_mode=(settings.ENVIRONMENT != "production")
        )
        
        # Create pending deposit record
        # Сохраняем order_id, курс и суммы в metadata
        deposit_metadata = {
            "orderId": order_id,
            "amount_rub": str(rub_amount),
            "amount_usd": str(usd_amount),
            "exchange_rate": str(exchange_rate),
            "allin_response": result
        }
        
        # Get transaction ID and convert to string
        transaction_id = result.get("transactionId") or result.get("id") or result.get("data", {}).get("transId")
        if transaction_id is not None:
            transaction_id = str(transaction_id)
        
        deposit = Deposit(
            user_id=current_user.id,
            amount_usd=usd_amount,  # Сохраняем в USD для баланса платформы
            amount_original=rub_amount,  # Сколько реально заплатил пользователь
            currency=request.currency,
            payment_method="allin",
            payment_provider="allin",
            provider_transaction_id=transaction_id,
            status="pending",
            metadata_=deposit_metadata
        )
        db.add(deposit)
        await db.commit()
        
        return {
            "status": "success",
            "payment_url": result.get("approvedUrl") or result.get("paymentUrl") or result.get("url") or result.get("data", {}).get("approvedUrl"),
            "order_id": order_id,
            "amount_rub": float(rub_amount),
            "amount_usd": float(usd_amount),
            "exchange_rate": float(exchange_rate),
            "currency": request.currency
        }
        
    except Exception as e:
        logger.error(f"Failed to create AllIn payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment creation failed: {str(e)}"
        )


@router.get("/allin/exchange-rate")
async def get_exchange_rate():
    """
    Get current USD/RUB exchange rate from CBR
    """
    try:
        rate = await exchange_service.get_usd_rate()
        return {
            "rate": float(rate),
            "currency_pair": "USD/RUB",
            "source": "Central Bank of Russia"
        }
    except Exception as e:
        logger.error(f"Failed to get exchange rate: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch exchange rate"
        )


# Глобальная переменная для хранения последнего webhook
last_webhook_data = None

@router.post("/allin/webhook")
async def allin_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle AllIn payment webhook
    """
    global last_webhook_data
    
    try:
        # Get raw body for signature verification
        body = await request.body()
        raw_body = body.decode('utf-8')
        
        # Сохраняем для отладки
        last_webhook_data = {
            "headers": dict(request.headers),
            "raw_body": raw_body,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.info("=" * 60)
        logger.info("🚨 ALLIN WEBHOOK RECEIVED")
        logger.info("=" * 60)
        logger.info(f"Headers: {dict(request.headers)}")
        logger.info(f"Raw body: {raw_body}")
        logger.info("=" * 60)
        
        # Пробуем распарсить JSON
        try:
            payload = json.loads(raw_body)
            logger.info(f"Parsed payload: {json.dumps(payload, indent=2)}")
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse JSON: {e}")
            # Может быть form-data?
            from urllib.parse import parse_qs
            form_data = parse_qs(raw_body)
            logger.info(f"Parsed as form data: {form_data}")
            payload = {k: v[0] if len(v) == 1 else v for k, v in form_data.items()}
        
        order_id = payload.get("orderId") or payload.get("order_id")
        status = payload.get("status")
        transaction_id = payload.get("transactionId") or payload.get("transId") or payload.get("id")
        
        logger.info(f"Extracted: order_id={order_id}, status={status}, trans_id={transaction_id}")
        
        # Find deposit by order ID (try multiple methods)
        deposit = None
        
        # Method 1: Search by orderId in metadata
        if order_id:
            logger.info(f"Searching for deposit with orderId: {order_id}")
            result = await db.execute(
                select(Deposit).where(
                    Deposit.metadata_.op('->>')('orderId') == order_id
                )
            )
            deposit = result.scalar_one_or_none()
            if deposit:
                logger.info(f"✅ Found deposit by metadata orderId: {order_id}, deposit_id={deposit.id}")
                logger.info(f"Deposit metadata: {deposit.metadata_}")
            else:
                logger.warning(f"❌ Deposit not found by orderId: {order_id}")
        
        # Method 2: Search by transaction_id
        if not deposit and transaction_id:
            result = await db.execute(
                select(Deposit).where(
                    Deposit.provider_transaction_id == str(transaction_id)
                )
            )
            deposit = result.scalar_one_or_none()
            if deposit:
                logger.info(f"Found deposit by transaction_id: {transaction_id}")
        
        # Method 3: List all pending allin deposits
        if not deposit:
            logger.info("Listing all pending allin deposits:")
            result = await db.execute(
                select(Deposit).where(
                    Deposit.payment_method == "allin",
                    Deposit.status == "pending"
                )
            )
            all_pending = result.scalars().all()
            for d in all_pending:
                logger.info(f"  - Deposit {d.id}: metadata={d.metadata_}, trans_id={d.provider_transaction_id}")
        
        if not deposit:
            logger.warning(f"❌ Deposit not found: order_id={order_id}")
            return {"status": "not_found", "order_id": order_id}
        
        # Update deposit status
        logger.info(f"Processing status update: current={deposit.status}, new={status}")
        
        if status in ["completed", "success", "paid", "complete"]:
            deposit.status = "completed"
            deposit.completed_at = datetime.utcnow()
            
            logger.info(f"💰 Payment completed! Adding ${deposit.amount_usd} to user {deposit.user_id}")
            
            # Update user balance
            result = await db.execute(
                select(Balance).where(Balance.user_id == deposit.user_id)
            )
            balance = result.scalar_one_or_none()
            if balance:
                old_balance = balance.balance_usd
                balance.balance_usd += deposit.amount_usd
                balance.last_deposit_at = datetime.utcnow()
                await db.flush()
                logger.info(f"✅ Balance updated: ${old_balance} -> ${balance.balance_usd}")
            else:
                logger.error(f"❌ Balance record not found for user {deposit.user_id}")
                
        elif status in ["failed", "cancelled", "expired"]:
            deposit.status = "failed"
        else:
            deposit.status = status
        
        await db.commit()
        logger.info("✅ Webhook processed successfully, changes committed to DB")
        logger.info("=" * 60)
        
        return {"status": "processed", "deposit_id": str(deposit.id), "new_status": deposit.status}
        
    except Exception as e:
        logger.error(f"❌ Webhook processing failed: {e}")
        logger.error(f"Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")


@router.get("/allin/debug/last-webhook")
async def get_last_webhook():
    """Debug endpoint to see last received webhook"""
    return last_webhook_data or {"message": "No webhook received yet"}


@router.post("/allin/debug/webhook-test")
async def test_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Test webhook endpoint - logs everything without processing"""
    body = await request.body()
    raw_body = body.decode('utf-8')
    
    logger.info("=" * 80)
    logger.info("🧪 TEST WEBHOOK ENDPOINT")
    logger.info("=" * 80)
    logger.info(f"Method: {request.method}")
    logger.info(f"URL: {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    logger.info(f"Raw body: {raw_body}")
    
    # Проверяем все депозиты
    result = await db.execute(
        select(Deposit).where(Deposit.payment_method == "allin").order_by(Deposit.created_at.desc()).limit(5)
    )
    deposits = result.scalars().all()
    logger.info(f"Last 5 allin deposits:")
    for d in deposits:
        logger.info(f"  {d.id}: status={d.status}, metadata={d.metadata_}")
    
    logger.info("=" * 80)
    
    return {"received": True, "body_preview": raw_body[:500]}


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
