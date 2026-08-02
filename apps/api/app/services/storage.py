"""Resource storage — uploads student files to Supabase Storage.

Requires SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (see .env.example). Without
them, files are written to a local `./uploads` directory so the upload flow
still works end-to-end during local development.
"""

import uuid
from pathlib import Path

from app.core.config import get_settings

settings = get_settings()

LOCAL_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"


def store_resource_file(course_id: str, filename: str, content: bytes) -> str:
    """Persists a resource file and returns its storage path/key."""
    key = f"{course_id}/{uuid.uuid4()}-{filename}"

    if settings.supabase_url and settings.supabase_service_role_key:
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        client.storage.from_(settings.supabase_storage_bucket).upload(key, content)
        return key

    LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = LOCAL_UPLOAD_DIR / key.replace("/", "__")
    dest.write_bytes(content)
    return str(dest)


def read_resource_file(storage_path: str) -> bytes:
    """Reads back a previously stored resource's raw bytes."""
    if settings.supabase_url and settings.supabase_service_role_key:
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_service_role_key)
        return client.storage.from_(settings.supabase_storage_bucket).download(storage_path)

    return Path(storage_path).read_bytes()
