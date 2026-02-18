"""
Currency Exchange Service
Fetches USD/RUB rate from Central Bank of Russia (cbr-xml-daily.ru)
"""
import httpx
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class ExchangeRateService:
    """Service for fetching and caching exchange rates"""
    
    def __init__(self):
        self._cache = {}
        self._cache_ttl = timedelta(hours=1)
        self._base_url = "https://www.cbr-xml-daily.ru/daily_json.js"
    
    async def get_usd_rate(self) -> Decimal:
        """
        Get current USD/RUB rate from CBR
        Returns: Decimal (e.g., 92.50)
        """
        cache_key = "usd_rub"
        
        # Check cache
        if cache_key in self._cache:
            cached_rate, cached_time = self._cache[cache_key]
            if datetime.utcnow() - cached_time < self._cache_ttl:
                logger.debug(f"Using cached USD rate: {cached_rate}")
                return cached_rate
        
        # Fetch fresh rate
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self._base_url, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                # Extract USD rate
                usd_data = data.get("Valute", {}).get("USD", {})
                if not usd_data:
                    raise ValueError("USD rate not found in CBR response")
                
                # CBR format: Nominal (usually 1), Value (rate)
                nominal = Decimal(str(usd_data.get("Nominal", 1)))
                value = Decimal(str(usd_data.get("Value", 0)))
                rate = value / nominal  # Rate per 1 USD
                
                # Cache the result
                self._cache[cache_key] = (rate, datetime.utcnow())
                
                logger.info(f"Fetched USD/RUB rate from CBR: {rate}")
                return rate
                
        except Exception as e:
            logger.error(f"Failed to fetch USD rate: {e}")
            # Return cached rate if available, even if expired
            if cache_key in self._cache:
                cached_rate, _ = self._cache[cache_key]
                logger.warning(f"Using expired cached rate: {cached_rate}")
                return cached_rate
            # Fallback rate
            logger.error("No cached rate available, using fallback 92.50")
            return Decimal("92.50")
    
    async def rub_to_usd(self, rub_amount: Decimal) -> Decimal:
        """
        Convert RUB to USD
        """
        rate = await self.get_usd_rate()
        usd_amount = rub_amount / rate
        # Round to 2 decimal places
        return usd_amount.quantize(Decimal("0.01"))
    
    async def usd_to_rub(self, usd_amount: Decimal) -> Decimal:
        """
        Convert USD to RUB (for display purposes)
        """
        rate = await self.get_usd_rate()
        rub_amount = usd_amount * rate
        # Round to 2 decimal places
        return rub_amount.quantize(Decimal("0.01"))
    
    def clear_cache(self):
        """Clear the cache - useful for testing"""
        self._cache.clear()
        logger.info("Exchange rate cache cleared")


# Singleton instance
exchange_service = ExchangeRateService()
