import aiohttp
from typing import Optional, Dict, Any
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

class AIRouterAPI:
    def __init__(self):
        self.base_url = settings.API_BASE_URL
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={"Content-Type": "application/json"}
            )
        return self.session
    
    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def verify_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Проверить API ключ и получить данные пользователя"""
        try:
            session = await self._get_session()
            
            logger.info(f"Verifying API key: {api_key[:20]}... against {self.base_url}")
            
            # Запрос к AI Router API
            async with session.get(
                f"{self.base_url}/client/balance",
                headers={"Authorization": f"Bearer {api_key}"}
            ) as response:
                logger.info(f"API response status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"API response data: {data}")
                    return {
                        "valid": True,
                        "user_id": data.get("user_id"),
                        "email": data.get("email"),
                        "balance": data.get("balance_usd"),
                        "api_key": api_key
                    }
                elif response.status == 401:
                    text = await response.text()
                    logger.warning(f"API 401 response: {text}")
                    return {"valid": False, "error": "Invalid API key"}
                else:
                    text = await response.text()
                    logger.error(f"API error: {response.status}, body: {text}")
                    return {"valid": False, "error": f"Service unavailable (status {response.status})"}
                    
        except Exception as e:
            logger.error(f"Error verifying API key: {e}", exc_info=True)
            return {"valid": False, "error": str(e)}
    
    async def get_user_info(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Получить информацию о пользователе"""
        try:
            session = await self._get_session()
            
            async with session.get(
                f"{self.base_url}/client/balance",
                headers={"Authorization": f"Bearer {api_key}"}
            ) as response:
                if response.status == 200:
                    return await response.json()
                return None
                    
        except Exception as e:
            logger.error(f"Error getting user info: {e}")
            return None
    
    async def get_recent_requests(self, api_key: str, limit: int = 5) -> Optional[list]:
        """Получить недавние запросы пользователя"""
        try:
            session = await self._get_session()
            
            async with session.get(
                f"{self.base_url}/client/recent-requests?limit={limit}",
                headers={"Authorization": f"Bearer {api_key}"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("requests", [])
                return None
                    
        except Exception as e:
            logger.error(f"Error getting recent requests: {e}")
            return None

# Global instance
api_client = AIRouterAPI()
