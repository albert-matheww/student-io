from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Student.io API"
    environment: str = "development"

    database_url: str = (
        "postgresql+psycopg://student_io:student_io_dev@localhost:5442/student_io"
    )
    redis_url: str = "redis://localhost:6379/0"

    # Auth — Clerk verifies sessions on the frontend; the API validates the
    # session JWT against Clerk's JWKS using this issuer.
    clerk_issuer: str | None = None
    clerk_secret_key: str | None = None

    # AI
    openai_api_key: str | None = None
    openai_chat_model: str = "gpt-4.1"
    openai_embedding_model: str = "text-embedding-3-large"
    openai_transcription_model: str = "whisper-1"

    # Storage (Supabase)
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "student-io-resources"

    # YouTube recommendations
    youtube_api_key: str | None = None

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
