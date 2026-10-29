from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from app.config import settings

_bucket: dict[str, list[datetime]] = {}


def check_rate_limit(ip: str) -> None:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=1)
    hits = [ts for ts in _bucket.get(ip, []) if ts > window_start]
    if len(hits) >= settings.request_limit_per_minute:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please retry in a minute.")
    hits.append(now)
    _bucket[ip] = hits
