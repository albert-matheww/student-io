"""Per-user rate limiting for the AI-backed endpoints.

Keyed by the caller's identity (Bearer token or X-Dev-User-Id) rather than
IP, since IP-based limits either over-restrict shared networks or under
restrict a single abusive user behind a proxy. Backed by Redis so limits are
shared across multiple API instances, not just per-process.
"""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()


def _rate_limit_key(request: Request) -> str:
    auth = request.headers.get("authorization")
    if auth:
        return auth
    dev_user = request.headers.get("x-dev-user-id")
    if dev_user:
        return f"dev:{dev_user}"
    return get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key, storage_uri=settings.redis_url)
