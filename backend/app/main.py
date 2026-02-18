from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import get_settings
from app.db.session import init_db
from app.api.v1.router import api_router

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.LOG_LEVEL == "DEBUG" else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    await init_db()
    yield
    # Shutdown


app = FastAPI(
    title=settings.APP_NAME,
    description="OpenRouter Reseller API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://airouter.host",
        "http://airouter.host",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/v1")


@app.get("/r/{code}")
async def referral_redirect(code: str):
    """Redirect from referral code to registration page"""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"https://airouter.host/register?ref={code}")


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
