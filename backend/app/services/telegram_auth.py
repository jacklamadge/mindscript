import hashlib
import hmac
import json
import urllib.parse
from datetime import datetime, timezone
from typing import Any

from app.config import settings


class TelegramAuthError(Exception):
    pass


def validate_init_data(init_data_raw: str, max_age_seconds: int = 86400) -> dict[str, Any]:
    """Проверяет подпись Telegram WebApp initData."""
    if not init_data_raw:
        raise TelegramAuthError("Пустой initData")
    if not settings.bot_token:
        raise TelegramAuthError("Не настроен BOT_TOKEN в .env")

    parsed = urllib.parse.parse_qs(init_data_raw, keep_blank_values=True)
    received_hash = parsed.get("hash", [None])[0]
    if not received_hash:
        raise TelegramAuthError("Нет hash в initData")

    pairs = []
    for k, v_list in parsed.items():
        if k == "hash":
            continue
        pairs.append(f"{k}={v_list[0]}")
    pairs.sort()
    data_check_string = "\n".join(pairs)

    secret = hmac.new(
        b"WebAppData",
        settings.bot_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    computed_hash = hmac.new(
        secret,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise TelegramAuthError("Неверная подпись initData")

    auth_date = int(parsed.get("auth_date", ["0"])[0] or "0")
    age = datetime.now(timezone.utc).timestamp() - auth_date
    if age > max_age_seconds:
        raise TelegramAuthError(f"initData устарел (возраст {age:.0f} сек)")

    result: dict[str, Any] = {k: v[0] for k, v in parsed.items()}
    if "user" in result:
        try:
            result["user"] = json.loads(result["user"])
        except Exception:
            pass
    return result


def extract_user_id(init_data_raw: str) -> int:
    """Возвращает Telegram user_id из initData после проверки подписи."""
    data = validate_init_data(init_data_raw)
    user = data.get("user")
    if not isinstance(user, dict) or "id" not in user:
        raise TelegramAuthError("Нет user.id в initData")
    return int(user["id"])