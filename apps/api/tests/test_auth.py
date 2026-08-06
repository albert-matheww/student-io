"""Regression coverage for the exact bug class that broke production: the
frontend not sending a session token once Clerk was configured. These tests
pin down get_current_user's contract from the backend side — when Clerk is
configured, a request without a Bearer token must be rejected, not silently
accepted via the dev-only header.
"""

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core import auth as auth_module
from app.core.auth import get_current_user


def _request(headers: dict[str, str]) -> Request:
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
    }
    return Request(scope)


def test_rejects_missing_dev_header_when_clerk_unconfigured(db, monkeypatch):
    monkeypatch.setattr(auth_module.settings, "clerk_issuer", None)
    monkeypatch.setattr(auth_module.settings, "clerk_secret_key", None)

    with pytest.raises(HTTPException) as exc:
        get_current_user(_request({}), db)
    assert exc.value.status_code == 401


def test_accepts_dev_header_when_clerk_unconfigured(db, monkeypatch):
    monkeypatch.setattr(auth_module.settings, "clerk_issuer", None)
    monkeypatch.setattr(auth_module.settings, "clerk_secret_key", None)

    user = get_current_user(_request({"X-Dev-User-Id": "pytest-dev-user"}), db)
    assert user.clerk_user_id == "pytest-dev-user"


def test_rejects_dev_header_when_clerk_is_configured(db, monkeypatch):
    """The dev header must never be a backdoor once real auth is live —
    this is precisely the gap the frontend fell into: a request that only
    carries X-Dev-User-Id (no Bearer token) has to be rejected outright."""
    monkeypatch.setattr(auth_module.settings, "clerk_issuer", "https://example.clerk.accounts.dev")
    monkeypatch.setattr(auth_module.settings, "clerk_secret_key", "sk_test_dummy")

    with pytest.raises(HTTPException) as exc:
        get_current_user(_request({"X-Dev-User-Id": "pytest-dev-user"}), db)
    assert exc.value.status_code == 401
    assert "session token" in str(exc.value.detail).lower()


def test_rejects_malformed_authorization_header_when_clerk_configured(db, monkeypatch):
    monkeypatch.setattr(auth_module.settings, "clerk_issuer", "https://example.clerk.accounts.dev")
    monkeypatch.setattr(auth_module.settings, "clerk_secret_key", "sk_test_dummy")

    with pytest.raises(HTTPException) as exc:
        get_current_user(_request({"Authorization": "not-a-bearer-token"}), db)
    assert exc.value.status_code == 401
