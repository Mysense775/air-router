from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AI Router Platform"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    SITE_URL: str = "https://airouter.host"
    
    # Security
    SECRET_KEY: str = "change-me-in-production"
    ENCRYPTION_KEY: str = "change-me-in-production"
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/ai_router"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # OpenRouter Master Keys (comma-separated)
    OPENROUTER_MASTER_KEYS: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    # Rate Limiting
    DEFAULT_RATE_LIMIT: str = "basic"
    
    # Email
    EMAIL_FROM: str = "noreply@ai-router.com"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    
    # Payment Providers
    NOWPAYMENTS_API_KEY: str = ""
    NOWPAYMENTS_IPN_SECRET: str = ""
    
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    
    YOOKASSA_SHOP_ID: str = ""
    YOOKASSA_SECRET_KEY: str = ""
    
    # AllIn Payment Configuration
    ALLIN_CLIENT_ID: str = ""
    ALLIN_CLIENT_SECRET: str = ""
    ALLIN_WEBHOOK_SECRET: str = ""
    
    # API Configuration
    API_BASE_URL: str = "https://airouter.host"
    
    # Monitoring
    SENTRY_DSN: str = ""
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
    
    @property
    def master_keys_list(self) -> List[str]:
        """Return list of master keys"""
        return [k.strip() for k in self.OPENROUTER_MASTER_KEYS.split(",") if k.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
