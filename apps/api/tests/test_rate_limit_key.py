"""The rate limiter buckets by caller identity, not IP — otherwise users
behind the same proxy/NAT (e.g. a university network) would share a quota,
and a single user rotating IPs could dodge theirs entirely.
"""

from starlette.requests import Request

from app.core.limiter import _rate_limit_key


def _request(headers: dict[str, str]) -> Request:
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": ("203.0.113.5", 12345),
    }
    return Request(scope)


def test_prefers_authorization_header():
    key = _rate_limit_key(_request({"Authorization": "Bearer abc123"}))
    assert key == "Bearer abc123"


def test_falls_back_to_dev_user_header():
    key = _rate_limit_key(_request({"X-Dev-User-Id": "alice"}))
    assert key == "dev:alice"


def test_authorization_takes_priority_over_dev_header():
    key = _rate_limit_key(_request({"Authorization": "Bearer abc123", "X-Dev-User-Id": "alice"}))
    assert key == "Bearer abc123"


def test_two_different_users_get_different_keys():
    key_a = _rate_limit_key(_request({"X-Dev-User-Id": "alice"}))
    key_b = _rate_limit_key(_request({"X-Dev-User-Id": "bob"}))
    assert key_a != key_b
