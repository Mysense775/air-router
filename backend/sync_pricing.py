"""
Sync model pricing from OpenRouter API.
Run: python sync_pricing.py

Fetches all model prices from OpenRouter and stores them in model_pricing table.
OpenRouter returns prices per token (e.g. 0.00000015 = $0.15/1M tokens).
"""
import asyncio
import httpx
import logging
from decimal import Decimal
from datetime import datetime

from app.db.session import async_session_maker
from app.models import ModelPricing
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"


async def fetch_openrouter_models() -> list:
    """Fetch model list with pricing from OpenRouter API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(OPENROUTER_MODELS_URL)
        response.raise_for_status()
        data = response.json()
        return data.get("data", [])


async def sync_pricing():
    """Sync model pricing from OpenRouter to database"""
    logger.info("Fetching models from OpenRouter...")
    models = await fetch_openrouter_models()
    logger.info(f"Got {len(models)} models from OpenRouter")

    updated = 0
    created = 0
    skipped = 0

    async with async_session_maker() as db:
        for model in models:
            model_id = model.get("id", "")
            pricing = model.get("pricing", {})

            # OpenRouter returns price per token as string
            prompt_price_str = pricing.get("prompt", "0")
            completion_price_str = pricing.get("completion", "0")

            try:
                prompt_price = Decimal(prompt_price_str) if prompt_price_str else Decimal("0")
                completion_price = Decimal(completion_price_str) if completion_price_str else Decimal("0")
            except Exception:
                logger.warning(f"  Skipping {model_id}: bad pricing data")
                skipped += 1
                continue

            # Skip free models (price = 0)
            if prompt_price == 0 and completion_price == 0:
                skipped += 1
                continue

            # Extract provider from model ID (e.g. "openai/gpt-4o" -> "openai")
            provider = model_id.split("/")[0] if "/" in model_id else "unknown"
            display_name = model.get("name", model_id)
            context_length = model.get("context_length")

            # Upsert
            result = await db.execute(
                select(ModelPricing).where(ModelPricing.id == model_id)
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.prompt_price = prompt_price
                existing.completion_price = completion_price
                existing.display_name = display_name
                existing.context_length = context_length
                existing.is_active = True
                existing.fetched_at = datetime.utcnow()
                updated += 1
            else:
                new_pricing = ModelPricing(
                    id=model_id,
                    provider=provider,
                    display_name=display_name,
                    prompt_price=prompt_price,
                    completion_price=completion_price,
                    context_length=context_length,
                    is_active=True,
                    fetched_at=datetime.utcnow(),
                )
                db.add(new_pricing)
                created += 1

        await db.commit()

    logger.info(f"Done! Created: {created}, Updated: {updated}, Skipped: {skipped}")


if __name__ == "__main__":
    asyncio.run(sync_pricing())
