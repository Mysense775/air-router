from fastapi import APIRouter

router = APIRouter()


@router.get("/stats")
async def get_stats():
    """Get platform statistics"""
    return {
        "total_users": 0,
        "total_requests_today": 0,
        "revenue_today": 0.00,
        "profit_today": 0.00
    }


@router.get("/master-accounts")
async def list_master_accounts():
    """List OpenRouter master accounts"""
    return {"accounts": []}


@router.get("/clients")
async def list_clients():
    """List all clients"""
    return {"clients": []}


@router.get("/logs")
async def get_logs():
    """Get request logs"""
    return {"logs": []}
