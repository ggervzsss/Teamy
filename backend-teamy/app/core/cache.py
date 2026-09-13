"""Optional Redis caching layer.

All functions are safe to call even when Redis is unavailable — they silently
fall back to ``None`` (cache miss) or no-op (cache set/invalidation).
"""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

import redis.asyncio as redis

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_pool: redis.Redis | None = None
_initialised = False


def get_redis() -> redis.Redis | None:
    """Return a shared async Redis client, or ``None`` when ``REDIS_URL`` is empty."""
    global _pool, _initialised  # noqa: PLW0603
    if _initialised:
        return _pool
    _initialised = True
    settings = get_settings()
    if not settings.redis_url:
        _pool = None
        return None
    _pool = redis.from_url(settings.redis_url, decode_responses=True)
    return _pool


DEFAULT_TTL_SECONDS = 43200
LONG_TTL_SECONDS = 43200


async def cache_get(key: str) -> Any | None:  # noqa: ANN401
    """Return the cached value for *key*, or ``None`` on miss / error."""
    client = get_redis()
    if client is None:
        return None
    try:
        raw = await client.get(key)
        if raw is None:
            logger.info("[CACHE MISS] key=%s", key)
            return None
        logger.info("[CACHE HIT] key=%s", key)
        return json.loads(raw)
    except Exception:
        logger.debug("cache_get failed for key=%s", key, exc_info=True)
        return None


async def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL_SECONDS) -> None:  # noqa: ANN401
    """Store a JSON-serialisable *value* under *key* with a TTL in seconds."""
    client = get_redis()
    if client is None:
        return
    try:
        await client.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception:
        logger.debug("cache_set failed for key=%s", key, exc_info=True)


async def invalidate_project(project_id: UUID) -> None:
    """Delete every cached key scoped to *project_id*."""
    client = get_redis()
    if client is None:
        return
    try:
        pattern = f"project:{project_id}:*"
        cursor: int | bytes = 0
        deleted_count = 0
        while True:
            cursor, keys = await client.scan(cursor=int(cursor), match=pattern, count=200)
            if keys:
                deleted_count += await client.delete(*keys)
            if int(cursor) == 0:
                break
        if deleted_count > 0:
            logger.info("[CACHE INVALIDATED] project_id=%s keys_deleted=%d", project_id, deleted_count)
    except Exception:
        logger.debug("invalidate_project failed for project_id=%s", project_id, exc_info=True)


async def invalidate_user(user_id: UUID) -> None:
    """Delete every cached key scoped to *user_id*."""
    client = get_redis()
    if client is None:
        return
    try:
        pattern = f"user:{user_id}:*"
        cursor: int | bytes = 0
        deleted_count = 0
        while True:
            cursor, keys = await client.scan(cursor=int(cursor), match=pattern, count=200)
            if keys:
                deleted_count += await client.delete(*keys)
            if int(cursor) == 0:
                break
        if deleted_count > 0:
            logger.info("[CACHE INVALIDATED] user_id=%s keys_deleted=%d", user_id, deleted_count)
    except Exception:
        logger.debug("invalidate_user failed for user_id=%s", user_id, exc_info=True)


async def close_redis() -> None:
    """Gracefully close the Redis connection pool."""
    global _pool, _initialised  # noqa: PLW0603
    if _pool is not None:
        await _pool.aclose()
        _pool = None
    _initialised = False
