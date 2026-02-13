"""Debug script for API key validation"""
import asyncio
import sys
sys.path.insert(0, '.')

import hashlib
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import User, ApiKey

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5433/ai_router"

async def debug():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Test key
        test_key = "sk-ar-test-key-123456789"
        key_hash = hashlib.sha256(test_key.encode()).hexdigest()
        
        print(f"Looking for key hash: {key_hash}")
        
        result = await db.execute(
            select(ApiKey, User)
            .join(User, ApiKey.user_id == User.id)
            .where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_active == True,
                User.status == "active"
            )
        )
        row = result.one_or_none()
        
        if row:
            api_key, user = row
            print(f"✅ Found! User: {user.email}, ID: {user.id}")
        else:
            print("❌ Not found")
            
            # Try without join
            result = await db.execute(
                select(ApiKey).where(ApiKey.key_hash == key_hash)
            )
            key = result.scalar_one_or_none()
            if key:
                print(f"  Key exists: {key.id}, user_id: {key.user_id}")
                
                # Check user separately
                result = await db.execute(
                    select(User).where(User.id == key.user_id)
                )
                user = result.scalar_one_or_none()
                if user:
                    print(f"  User exists: {user.email}, status: {user.status}")
                else:
                    print(f"  ❌ User not found for ID: {key.user_id}")
            else:
                print("  ❌ Key not found at all")

if __name__ == "__main__":
    asyncio.run(debug())
