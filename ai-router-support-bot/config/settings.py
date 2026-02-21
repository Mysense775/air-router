from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Telegram Bot
    BOT_TOKEN: str = "8549699847:AAE_R4pJyqwDXHfudJPJktDmbWB4GFMhOts"
    
    # AI Router API
    API_BASE_URL: str = "http://localhost:8000/v1"
    API_KEY: str = ""  # Для внутренних запросов к backend
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_router"
    
    # Support Group
    SUPPORT_GROUP_ID: str = ""  # ID группы поддержки (начинается с -100)
    
    # Redis (для кэша и состояний)
    REDIS_URL: str = "redis://localhost:6379/1"
    
    # Bot Settings
    DEFAULT_PRIORITY: str = "medium"  # low, medium, high, critical
    AUTO_REPLY_ENABLED: bool = True
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
