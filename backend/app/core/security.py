from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import get_settings

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token (extended to 1 year for convenience)"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Extended to 1 year (365 days) so tokens don't expire frequently
        expire = datetime.utcnow() + timedelta(days=365)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        return None


def generate_api_key() -> str:
    """Generate random API key"""
    import secrets
    return "air_" + secrets.token_urlsafe(32)


# Master API Key Encryption (Fernet)
from cryptography.fernet import Fernet
import base64
import hashlib


def _get_fernet() -> Fernet:
    """Get Fernet instance from SECRET_KEY"""
    # Derive 32-byte key from SECRET_KEY using SHA256
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    # Encode to base64 for Fernet
    fernet_key = base64.urlsafe_b64encode(key)
    return Fernet(fernet_key)


def encrypt_master_api_key(api_key: str) -> str:
    """Encrypt master API key using Fernet (AES-128-CBC + HMAC)"""
    f = _get_fernet()
    encrypted = f.encrypt(api_key.encode())
    return encrypted.decode()


def decrypt_master_api_key(encrypted_key: str) -> str:
    """Decrypt master API key using Fernet"""
    try:
        f = _get_fernet()
        decrypted = f.decrypt(encrypted_key.encode())
        return decrypted.decode()
    except Exception:
        # Fallback: try old base64 decoding for backward compatibility
        try:
            import base64 as b64
            return b64.b64decode(encrypted_key.encode()).decode()
        except Exception:
            raise ValueError("Failed to decrypt API key")
