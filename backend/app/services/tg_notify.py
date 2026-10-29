import httpx
from app.config import settings


def send_tg_message(chat_id: int, text: str, mini_app_url: str = "") -> None:
    """Шлёт сообщение пользователю в Telegram. Ошибки молча игнорируются."""
    if not settings.bot_token:
        return
    payload: dict = {"chat_id": chat_id, "text": text}
    if mini_app_url:
        payload["reply_markup"] = {
            "inline_keyboard": [[
                {"text": "⚡ Открыть MindScript", "web_app": {"url": mini_app_url}}
            ]]
        }
    try:
        httpx.post(
            f"https://api.telegram.org/bot{settings.bot_token}/sendMessage",
            json=payload,
            timeout=10,
        )
    except Exception as exc:
        print("⚠️ TG notify error:", exc)