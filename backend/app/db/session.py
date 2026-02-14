from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import get_settings

settings = get_settings()

# Use DATABASE_URL from settings
DATABASE_URL = settings.DATABASE_URL

# Create async engine with proper connection pooling for production
engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Verify connections before using them
    pool_size=10,             # Base pool size
    max_overflow=20,          # Max additional connections
    pool_recycle=300,         # Recycle connections after 5 minutes
    pool_timeout=30,          # Wait up to 30s for available connection
    pool_use_lifo=True,       # LIFO for better connection reuse
    echo=False,
)

# Create session factory with production settings
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,   # Don't expire objects after commit
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def get_db():
    """Dependency for getting database session"""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        # Don't auto-create in production, use migrations
        # await conn.run_sync(Base.metadata.create_all)
        pass


async def check_db_connection():
    """Check if database connection is working"""
    try:
        async with engine.connect() as conn:
            result = await conn.execute("SELECT 1")
            return True
    except Exception as e:
        return False
