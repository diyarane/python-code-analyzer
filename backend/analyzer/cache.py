from __future__ import annotations

import hashlib
import json
import logging
import os

try:
    import redis
except ImportError:
    redis = None  # type: ignore

logger = logging.getLogger(__name__)

REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))
REDIS_TTL = int(os.environ.get("REDIS_TTL", "3600"))
CACHE_PREFIX = "codeanalyzer:v1"

_redis_client = None
_client_failed = False


def get_redis_client():
    """Lazy initialize Redis client with fallback."""
    global _redis_client, _client_failed
    if redis is None:
        return None
    if _client_failed:
        return None
    if _redis_client is None:
        try:
            _redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                socket_timeout=0.5,
                socket_connect_timeout=0.5,
                decode_responses=True,
            )
            # Test ping
            _redis_client.ping()
        except Exception as err:
            logger.warning("Redis unavailable (%s:%s): %s", REDIS_HOST, REDIS_PORT, err)
            _redis_client = None
            _client_failed = True
            return None
    return _redis_client


def make_cache_key(source_code: str) -> str:
    """Generate deterministic cache key using SHA-256 hash of code."""
    source_hash = hashlib.sha256(source_code.encode("utf-8")).hexdigest()
    return f"{CACHE_PREFIX}:{source_hash}"


def get_cached_analysis(source_code: str) -> dict | None:
    """Retrieve cached analysis result if available, else return None."""
    client = get_redis_client()
    if not client:
        return None
    try:
        key = make_cache_key(source_code)
        raw_data = client.get(key)
        if raw_data:
            data = json.loads(raw_data)
            if isinstance(data, dict):
                data["cached"] = True
                return data
    except Exception as err:
        logger.warning("Redis cache read error: %s", err)
    return None


def set_cached_analysis(source_code: str, result: dict) -> None:
    """Store successful analysis result in Redis with TTL."""
    if not result.get("success"):
        return
    client = get_redis_client()
    if not client:
        return
    try:
        key = make_cache_key(source_code)
        # Store clean copy without runtime transient flags
        clean_result = {k: v for k, v in result.items() if k != "cached"}
        payload = json.dumps(clean_result)
        client.setex(key, REDIS_TTL, payload)
    except Exception as err:
        logger.warning("Redis cache write error: %s", err)
