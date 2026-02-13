"""
Create test user script for AI Router Platform
Usage: python3 create_test_user.py
"""

import asyncio
import sys
import os
import hashlib
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import User, ApiKey, Balance
from app.db.session import Base

# Database URL (same as in config)
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_router"

async def create_test_user():
    """Create a test user with API key and balance"""
    
    # Create engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Check if test user already exists
        from sqlalchemy import select
        result = await db.execute(
            select(User).where(User.email == "test@example.com")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"Test user already exists: {existing_user.id}")
            user = existing_user
        else:
            # Create user
            user = User(
                email="test@example.com",
                password_hash="$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # password: test123
                name="Test User",
                role="client",
                status="active",
                email_verified=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            print(f"Created user: {user.id}")
        
        # Check if API key exists
        result = await db.execute(
            select(ApiKey).where(ApiKey.user_id == user.id)
        )
        existing_key = result.scalar_one_or_none()
        
        if existing_key:
            print(f"API key already exists")
        else:
            # Create API key
            api_key_value = "sk-ar-test-key-123456789"
            key_hash = hashlib.sha256(api_key_value.encode()).hexdigest()
            
            api_key = ApiKey(
                user_id=user.id,
                key_hash=key_hash,
                name="Test Key",
                is_active=True
            )
            db.add(api_key)
            await db.commit()
            print(f"Created API key: {api_key_value}")
            print(f"Key hash: {key_hash}")
        
        # Check if balance exists
        result = await db.execute(
            select(Balance).where(Balance.user_id == user.id)
        )
        existing_balance = result.scalar_one_or_none()
        
        if existing_balance:
            print(f"Balance already exists: ${existing_balance.balance_usd}")
            # Update balance to $10
            existing_balance.balance_usd = Decimal("10.00")
            await db.commit()
            print(f"Updated balance to $10.00")
        else:
            # Create balance
            balance = Balance(
                user_id=user.id,
                balance_usd=Decimal("10.00"),
                lifetime_spent=Decimal("0.00"),
                lifetime_earned=Decimal("10.00")
            )
            db.add(balance)
            await db.commit()
            print(f"Created balance: $10.00")
        
        print("\n" + "="*50)
        print("Test user created successfully!")
        print("="*50)
        print(f"Email: test@example.com")
        print(f"Password: test123")
        print(f"API Key: sk-ar-test-key-123456789")
        print(f"Balance: $10.00")
        print("="*50)

if __name__ == "__main__":
    asyncio.run(create_test_user())
