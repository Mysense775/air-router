"""
AllIn Payment Integration Service
https://allin.direct/merchant/api
"""

import httpx
import hashlib
import json
import asyncio
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
        """Get OAuth2 access token with retry"""
        if self.access_token and self.token_expires_at and datetime.utcnow() < self.token_expires_at:
            return self.access_token
        
        logger.info(f"Requesting AllIn auth token from {ALLIN_AUTH_URL}")
        
        # Retry logic for temporary AllIn errors
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        ALLIN_AUTH_URL,
                        json={
                            "client_id": self.client_id,
                            "client_secret": self.client_secret
                        },
                        headers={"Content-Type": "application/json"},
                        timeout=30.0
                    )
                    
                    logger.debug(f"Auth attempt {attempt+1}: status={response.status_code}")
                    
                    # If 500 error, retry
                    if response.status_code >= 500:
                        logger.warning(f"AllIn server error {response.status_code}, retrying...")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2 ** attempt)  # Exponential backoff
                            continue
                    
                    response.raise_for_status()
                    data = response.json()
                    
                    self.access_token = data.get("access_token") or data.get("token") or data.get("data", {}).get("access_token")
                    self.token_expires_at = datetime.utcnow() + timedelta(minutes=55)
                    
                    logger.info(f"AllIn token obtained: {self.access_token[:20]}...")
                    return self.access_token
                    
            except httpx.HTTPStatusError as e:
                logger.error(f"AllIn auth HTTP {e.response.status_code}: {e.response.text[:200]}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise
            except Exception as e:
                logger.error(f"AllIn auth error: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise
        
        raise Exception("Failed to get AllIn token after max retries")

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
        """
        token = await self._get_access_token()
        
        # Generate signature: MD5(clientId:orderId:amount:currency:extraData:clientSecret)
        sign_string = f"{self.client_id}:{order_id}:{str(amount)}:{currency}::{self.client_secret}"
        sign = hashlib.md5(sign_string.encode('utf-8')).hexdigest()
        logger.debug(f"Generated sign: {sign}")
        
        payload = {
            "orderId": order_id,
            "amount": str(amount),
            "currency": currency,
            "defaultPayCurrency": currency,
            "description": description,
            "extraData": "",
            "sign": sign,
            "webhookUrl": webhook_url,
            "successUrl": success_url,
            "cancelUrl": cancel_url,
            "email": email,
            "testMode": 0 if not test_mode else 1
        }
        
        logger.info(f"Creating AllIn payment: order_id={order_id}, amount={amount} {currency}")
        logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    ALLIN_INIT_URL,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {token}"
                    },
                    timeout=30.0
                )
                
                logger.debug(f"Create payment response status: {response.status_code}")
                response_text = response.text
                logger.info(f"Create payment response: {response_text[:1000]}")
                
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"AllIn payment created successfully: order_id={order_id}")
                return result
                
            except httpx.HTTPStatusError as e:
                logger.error(f"AllIn create payment HTTP error: {e.response.status_code}")
                logger.error(f"Response: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"AllIn create payment error: {str(e)}")
                raise
    
    async def check_status(self, transaction_id: str) -> Dict[str, Any]:
        """Check payment status by transaction ID"""
        token = await self._get_access_token()
        
        logger.info(f"Checking AllIn status: trans_id={transaction_id}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{ALLIN_STATUS_URL}/{transaction_id}",
                    data="null",
                    headers={
                        "Authorization": f"Bearer {token}"
                    },
                    timeout=30.0
                )
                
                response_text = response.text
                logger.info(f"Status response: {response_text[:500]}")
                
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"AllIn status: trans_id={transaction_id}, status={result.get('status')}")
                return result
                
            except httpx.HTTPStatusError as e:
                logger.error(f"AllIn status check HTTP error: {e.response.status_code}")
                logger.error(f"Response: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"AllIn status check error: {str(e)}")
                raise
    
    async def get_transaction_info(self, transaction_id: str) -> Dict[str, Any]:
        """Get detailed transaction info"""
        token = await self._get_access_token()
        
        logger.info(f"Getting AllIn transaction info: trans_id={transaction_id}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{ALLIN_INFO_URL}/{transaction_id}",
                    data="null",
                    headers={
                        "Authorization": f"Bearer {token}"
                    },
                    timeout=30.0
                )
                
                response_text = response.text
                logger.info(f"Info response: {response_text[:1000]}")
                
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"AllIn info retrieved: trans_id={transaction_id}")
                return result
                
            except httpx.HTTPStatusError as e:
                logger.error(f"AllIn info HTTP error: {e.response.status_code}")
                logger.error(f"Response: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"AllIn info error: {str(e)}")
                raise
    
    async def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """Verify webhook signature"""
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected)


# Singleton instance
allin_service = AllInPaymentService()
