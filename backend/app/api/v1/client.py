from fastapi import APIRouter, Depends

router = APIRouter()


@router.get("/balance")
async def get_balance():
    """Get current balance"""
    return {"balance_usd": 0.00, "currency": "USD"}


@router.get("/usage")
async def get_usage(days: int = 7):
    """Get usage statistics"""
    return {
        "period": f"{days}d",
        "total_requests": 0,
        "total_tokens": 0,
        "total_cost": 0.00
    }


@router.get("/api-keys")
async def list_api_keys():
    """List user's API keys"""
    return {"keys": []}
