from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import close_db, connect_db
from app.routers import bookings, courses, health, tee_times, users
from app.seed import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await connect_db()
    await seed_if_empty()
    yield
    await close_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Noteefy API", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(users.router)
    app.include_router(courses.router)
    app.include_router(tee_times.router)
    app.include_router(bookings.router)
    return app


app = create_app()
