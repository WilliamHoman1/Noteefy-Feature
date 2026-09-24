from fastapi import APIRouter

from app.db import ping_db

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health() -> dict:
    mongo_ok = await ping_db()
    return {
        "status": "ok" if mongo_ok else "degraded",
        "mongo": "ok" if mongo_ok else "down",
    }
