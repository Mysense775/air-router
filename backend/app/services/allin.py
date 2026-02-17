"""
AllIn Payment Integration Service
https://allin.direct/merchant/api
"""

import httpx
import hmac
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from decimal import Decimal
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# AllIn API Configuration
ALLIN_BASE_URL = "https://allin.direct/merchant/api"
ALLIN_AUTH_URL = f"{ALLIN_BASE_URL}/auth"
ALLIN_INIT_URL = f"{ALLIN_BASE_URL}/transaction/init"
ALLIN_STATUS_URL = f"{ALLIN_BASE_URL}/transaction/status"
ALLIN_INFO_URL = f"{ALLIN_BASE_URL}/transaction/info"


class AllInPaymentService:
    """Service for AllIn payment integration"""
    
    def __init__(self):
        self.client_id = settings.ALLIN_CLIENT_ID
        self.client_secret = settings.ALLIN_CLIENT_SECRET
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
    
    async def _get_access_token(self) -> str:
        """Get OAuth2 access token"""
        if self.access_token and self.token_expires_at and datetime.utcnow() < self.token_expires_at:
            return self.access_token
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                ALLIN_AUTH_URL,
                json={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
            
            self.access_token = data.get("access_token") or data.get("token")
            # Token typically valid for 1 hour
            self.token_expires_at = datetime.utcnow() + timedelta(minutes=55)
            
            logger.info("AllIn access token obtained")
            return self.access_token
    
    async def create_payment(
        self,
        order_id: str,
        amount: Decimal,
        currency: str = "RUB",
        description: str = "",
        webhook_url: str = "",
        success_url: str = "",
        cancel_url: str = "",
        email: str = "",
        test_mode: bool = True
    ) -> Dict[str, Any]:
        """
        Create new payment transaction
        
        Args:
            order_id: Unique order ID
            amount: Payment amount
            currency: Currency code (RUB, USD, etc.)
            description: Payment description
            webhook_url: URL for payment notifications
            success_url: Redirect URL on success
            cancel_url: Redirect URL on cancel
            email: Customer email
            test_mode: Test mode flag
        
        Returns:
            Payment creation response
        """
        token = await self._get_access_token()
        
        payload = {
            "orderId": order_id,
            "amount": str(amount),
            "currency": currency,
            "defaultPayCurrency": currency,
            "payCurrencies": f"{currency},USDT",
            "description": description,
            "extraData": "",
            "locale": "ru",
            "sign": "",  # TODO: Implement signature if required
            "webhookUrl": webhook_url,
            "successUrl": success_url,
            "cancelUrl": cancel_url,
            "testMode": 1 if test_mode else 0,
            "email": email,
            "hrpMode": 1,
            "payer": "All"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                ALLIN_INIT_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                },
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"AllIn payment created: order_id={order_id}, amount={amount}")
            return result
    
    async def check_status(self, transaction_id: str) -> Dict[str, Any]:
        """
        Check payment status by transaction ID
        
        Args:
            transaction_id: AllIn transaction ID
        
        Returns:
            Status response
        """
        token = await self._get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ALLIN_STATUS_URL}/{transaction_id}",
                data="null",  # Empty body as per docs
                headers={
                    "Authorization": f"Bearer {token}"
                },
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"AllIn status checked: trans_id={transaction_id}, status={result.get('status')}")
            return result
    
    async def get_transaction_info(self, transaction_id: str) -> Dict[str, Any]:
        """
        Get detailed transaction info by transaction ID
        
        Args:
            transaction_id: AllIn transaction ID
        
        Returns:
            Detailed transaction information
        """
        token = await self._get_access_token()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ALLIN_INFO_URL}/{transaction_id}",
                data="null",  # Empty body as per docs
                headers={
                    "Authorization": f"Bearer {token}"
                },
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"AllIn transaction info retrieved: trans_id={transaction_id}")
            return result
    
    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """
        Verify webhook signature
        TODO: Implement based on AllIn documentation
        """
        # Placeholder - need actual signature algorithm from docs
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected)


# Singleton instance
allin_service = AllInPaymentService()
