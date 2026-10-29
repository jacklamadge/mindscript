# bot/bot.py — Telegram бот для MindScript Mini App
import asyncio
import json
import sqlite3
import time
from pathlib import Path

import sys

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))
from app.config import settings

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    WebAppInfo,
)

# --- Настройки ---
ADMIN_IDS = {"5189141840", "8498252327", "1678182897", "1682568190","5955260280"}
BOT_TOKEN = settings.bot_token
DB_PATH = BACKEND_DIR / "vibepromt.db"


_DEFAULT_MINI = "https://mindscript-64qg.onrender.com"
_raw = (settings.mini_app_url or "").strip().rstrip("/")
# Render иногда хранит старый placeholder — не даём ему сломать кнопку
if not _raw or "placeholder" in _raw or "ngrok" in _raw:
    MINI_APP_URL = _DEFAULT_MINI
else:
    MINI_APP_URL = _raw
print("Mini App URL:", MINI_APP_URL)
print("DB path:", DB_PATH, "EXISTS" if DB_PATH.exists() else "NOT FOUND")
from aiogram.client.session.aiohttp import AiohttpSession
session = AiohttpSession(timeout=60.0)
bot = Bot(token=BOT_TOKEN, session=session)
dp = Dispatcher()


# --- /start ---
@dp.message(CommandStart())
async def start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="⚡ Открыть MindScript",
            web_app=WebAppInfo(url=MINI_APP_URL)
        )]
    ])
    await message.answer(
        "Привет! Это <b>MindScript</b>.\n\n"
        "За <b>1 минуту</b> получи готовый промпт для Claude, ChatGPT или Copilot 📝\n"
        "Ответь на 7 вопросов в коротком квизе — MindScript проанализирует твои ответы "
        "и сам определит, какие детали нужно уточнить, чтобы промпт точно соответствовал "
        "твоей задаче.\n\n"
        "Попробуй прямо сейчас — нажми кнопку ниже 👇",
        reply_markup=kb,
        parse_mode="HTML",
    )


# --- /broadcast ---
@dp.message(lambda m: m.text and m.text.split()[0].lower() in {"/boardcast", "/рассылка"})
async def broadcast(message: types.Message):
    if str(message.from_user.id) not in ADMIN_IDS:
        await message.answer("🚫 Недоступно")
        return

    text_msg = " ".join((message.text or "").split()[1:]).strip()
    if not text_msg:
        await message.answer("⚠️ Формат: /broadcast Текст сообщения")
        return

    if not DB_PATH.exists():
        await message.answer(f"❌ БД не найдена: {DB_PATH}")
        return

    sent, errors = 0, 0
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cur = conn.cursor()
        # Поддерживаем оба варианта: отдельное поле telegram_id или email-паттерн
        try:
            cur.execute("SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL")
            ids = [r[0] for r in cur.fetchall()]
        except sqlite3.OperationalError:
            cur.execute("SELECT email FROM users WHERE email LIKE 'tg_%'")
            ids = []
            for (email,) in cur.fetchall():
                try:
                    ids.append(int(email.split("@")[0].replace("tg_", "")))
                except Exception:
                    pass
        conn.close()

        for tg_id in ids:
            try:
                await bot.send_message(tg_id, text_msg)
                sent += 1
            except Exception as e:
                errors += 1
    except Exception as e:
        await message.answer(f"❌ Ошибка: {e}")
        return

    await message.answer(f"✅ Рассылка завершена: отправлено {sent}, ошибок {errors}")


# --- Запуск ---
async def main():
    try:
        await bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Открыть MindScript",
                web_app=WebAppInfo(url=MINI_APP_URL),
            )
        )
        print("Menu Button OK")
    except Exception as e:
        print(f"Menu Button: {e}")

    print(f"Mini App: {MINI_APP_URL}")
    print("Bot started. Send /start")

    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
