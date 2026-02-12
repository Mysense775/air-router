from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter()


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/register", response_model=TokenResponse)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register new user"""
    # TODO: Implement registration
    # 1. Check if email exists
    # 2. Hash password
    # 3. Create user
    # 4. Create balance
    # 5. Generate tokens
    raise HTTPException(501, "Not implemented yet")


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login user"""
    # TODO: Implement login
    # 1. Find user by email
    # 2. Verify password
    # 3. Generate tokens
    raise HTTPException(501, "Not implemented yet")


@router.post("/refresh")
async def refresh_token():
    """Refresh access token"""
    raise HTTPException(501, "Not implemented yet")
