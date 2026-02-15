from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import uuid4
from decimal import Decimal

from app.db.session import get_db
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, decode_token,
    generate_api_key
)
from app.models import User, Balance, ApiKey

router = APIRouter()
security = HTTPBearer(auto_error=False)


# Request/Response schemas
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: Optional[str] = None
    role: Optional[str] = Field(default="client", pattern="^(client|investor)$")  # client или investor


class RegisterResponse(BaseModel):
    message: str
    user_id: str
    email: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    force_password_change: bool = False
    token_type: str = "bearer"
    expires_in: int = 900  # 15 minutes


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    role: str
    created_at: str


class ApiKeyCreateRequest(BaseModel):
    name: str = "Default"
    model_id: Optional[str] = None  # Если указано - ключ только для этой модели


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key: str  # Only shown once on creation
    allowed_model: Optional[str] = None  # Разрешенная модель (None = любая)
    is_active: bool
    created_at: str


class ApiKeyListResponse(BaseModel):
    id: str
    name: str
    allowed_model: Optional[str] = None
    is_active: bool
    last_used_at: Optional[str]
    created_at: str


# Dependencies
TEST_MODE = False  # ✅ PRODUCTION MODE ENABLED

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current user from JWT token (TEST MODE: auth bypassed)"""
    
    # TEST MODE: Return admin user without authentication
    if TEST_MODE:
        result = await db.execute(
            select(User).where(User.email == "admin@ai-router.com")
        )
        user = result.scalar_one_or_none()
        if user:
            return user
        # If admin user not found, raise error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin user not found",
        )
    
    # PRODUCTION MODE: Normal JWT authentication
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    result = await db.execute(
        select(User).where(User.id == user_id, User.status == "active")
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user is active"""
    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive or suspended",
        )
    return current_user


# Auth endpoints
@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register new user (no email confirmation required)"""
    from app.models import Balance
    
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password
    if len(data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # Determine role (client or investor)
    user_role = data.role if data.role in ["client", "investor"] else "client"
    
    # Create user with verified email (no confirmation needed)
    user = User(
        id=uuid4(),
        email=data.email,
        name=data.name,
        password_hash=get_password_hash(data.password),
        role=user_role,
        status="active",
        email_verified=True,
        force_password_change=False
    )
    db.add(user)
    await db.flush()
    
    # Create empty balance only for clients (investors don't need client balance)
    if user_role == "client":
        balance = Balance(
            user_id=user.id,
            balance_usd=Decimal("0.00"),
            lifetime_spent=Decimal("0.00"),
            lifetime_earned=Decimal("0.00")
        )
        db.add(balance)
    
    await db.commit()
    
    return RegisterResponse(
        message="Registration successful. You can now log in.",
        user_id=str(user.id),
        email=user.email
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login user"""
    # Find user
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account is {user.status}",
        )
    
    # Generate tokens with role
    access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        force_password_change=user.force_password_change or False
    )


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Change password (required for admin-created users on first login)"""
    # Verify old password
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid old password"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(data.new_password)
    current_user.force_password_change = False
    
    await db.commit()
    
    return {"message": "Password changed successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Refresh access token using refresh token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    # Generate new tokens
    access_token = create_access_token({"sub": user_id})
    refresh_token = create_refresh_token({"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current user info"""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None
    )


# API Key management
@router.post("/api-keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    data: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new API key for user"""
    # Generate key
    raw_key = generate_api_key()
    import hashlib
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    
    # Create API key record
    api_key = ApiKey(
        id=uuid4(),
        user_id=current_user.id,
        key_hash=key_hash,
        name=data.name,
        allowed_model=data.model_id,  # Привязка к конкретной модели
        is_active=True
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    
    return ApiKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        key=raw_key,  # Only shown once!
        allowed_model=api_key.allowed_model,
        is_active=api_key.is_active,
        created_at=api_key.created_at.isoformat() if api_key.created_at else None
    )


@router.get("/api-keys", response_model=list[ApiKeyListResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's API keys (without actual keys)"""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    api_keys = result.scalars().all()
    
    return [
        ApiKeyListResponse(
            id=str(key.id),
            name=key.name,
            allowed_model=key.allowed_model,
            is_active=key.is_active,
            last_used_at=key.last_used_at.isoformat() if key.last_used_at else None,
            created_at=key.created_at.isoformat() if key.created_at else None
        )
        for key in api_keys
    ]


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke (deactivate) an API key"""
    from uuid import UUID
    
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.id == UUID(key_id), ApiKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    api_key.is_active = False
    await db.commit()
    
    return None
