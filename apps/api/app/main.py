from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import Base, engine
from app.routers import courses, flashcards, gamification, lessons, onboarding, revision, search

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(onboarding.router)
app.include_router(courses.router)
app.include_router(lessons.router)
app.include_router(revision.router)
app.include_router(flashcards.router)
app.include_router(search.router)
app.include_router(gamification.router)


@app.on_event("startup")
def on_startup() -> None:
    # Dev convenience only — Alembic migrations (apps/api/alembic/) own the
    # schema once this ships beyond local development.
    if settings.environment == "development":
        Base.metadata.create_all(bind=engine)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "environment": settings.environment}
