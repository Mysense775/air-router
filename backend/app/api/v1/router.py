from fastapi import APIRouter

from app.api.v1 import auth, client, admin, proxy

api_router = APIRouter()

# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0", "service": "ai-router-api"}

# Public proxy endpoints (OpenRouter compatible)
api_router.include_router(proxy.router, prefix="", tags=["Proxy"])

# Client management
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(client.router, prefix="/client", tags=["Client"])

# Admin endpoints
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
