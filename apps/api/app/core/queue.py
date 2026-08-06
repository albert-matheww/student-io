"""Background job queue — RQ backed by the same Redis instance already used
for rate limiting, so processing resource uploads doesn't block the request
worker or contend with other users' uploads in-process.
"""

from functools import lru_cache

import redis
from rq import Queue

from app.core.config import get_settings

settings = get_settings()


@lru_cache
def get_queue() -> Queue:
    connection = redis.from_url(settings.redis_url)
    return Queue("student-io", connection=connection)
