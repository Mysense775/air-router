from fastapi import APIRouter

from app.api.v1 import auth, client, admin, proxy, payments, advisor, investor, admin_investor

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
api_router.include_router(admin_investor.router, prefix="/admin", tags=["Admin Investor"])

# Payment endpoints
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])

# Advisor endpoints
api_router.include_router(advisor.router, prefix="/advisor", tags=["Advisor"])

# Investor endpoints
api_router.include_router(investor.router, prefix="/investor", tags=["Investor"])
