"""Session verification against Clerk.

Clerk issues a short-lived session JWT to the frontend (via `@clerk/nextjs`).
The API verifies that JWT against Clerk's JWKS rather than trusting the
frontend, then resolves/creates the local `User` row keyed by `clerk_user_id`.

Until CLERK_SECRET_KEY / CLERK_ISSUER are configured (see .env.example), the
API accepts an `X-Dev-User-Id` header instead, so the rest of the stack is
runnable end-to-end during local development without a Clerk account.
"""

from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, Request, status
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models import User

settings = get_settings()


@lru_cache
def _jwks() -> dict:
    resp = httpx.get(f"{settings.clerk_issuer}/.well-known/jwks.json", timeout=5)
    resp.raise_for_status()
    return resp.json()


def _verify_clerk_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
        key = next(k for k in _jwks()["keys"] if k["kid"] == header["kid"])
        return jwt.decode(token, key, algorithms=[header["alg"]], issuer=settings.clerk_issuer)
    except (httpx.HTTPError, StopIteration, jwt.JWTError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session") from exc


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    if settings.clerk_issuer and settings.clerk_secret_key:
        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing session token")
        claims = _verify_clerk_token(auth_header.removeprefix("Bearer "))
        clerk_user_id = claims["sub"]
        email = claims.get("email", f"{clerk_user_id}@unknown.student.io")
    else:
        dev_user_id = request.headers.get("x-dev-user-id")
        if not dev_user_id:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                "Clerk is not configured — pass X-Dev-User-Id for local development. "
                "See apps/api/.env.example.",
            )
        clerk_user_id = dev_user_id
        email = f"{dev_user_id}@dev.student.io"

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).first()
    if user is None:
        user = User(clerk_user_id=clerk_user_id, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
