import sqlite3
from pathlib import Path
from app.config import settings


def _db_path() -> Path:
    """Извлекает путь к файлу из sqlite:///./vibepromt.db"""
    db_url = getattr(settings, "database_url", "sqlite:///./vibepromt.db")
    if db_url.startswith("sqlite:///"):
        raw = db_url.replace("sqlite:///", "", 1)
        return Path(__file__).resolve().parent.parent / raw.lstrip("./")
    return Path(__file__).resolve().parent.parent / "vibepromt.db"


def ensure_schema() -> None:
    """
    Добавляет новые колонки в существующую БД (миграция без потерь данных).
    Если БД или таблица users ещё не созданы — ничего не делает (SQLAlchemy создаст их позже).
    """
    db_path = _db_path()
    if not db_path.exists():
        print(f"ℹ️  БД ещё не создана: {db_path}")
        return

    try:
        conn = sqlite3.connect(str(db_path))
        cur = conn.cursor()

        # 1. Проверяем, существует ли таблица users
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cur.fetchone():
            print("ℹ️  Таблица users ещё не создана — будет создана автоматически")
            conn.close()
            return

        # 2. Получаем список колонок
        cur.execute("PRAGMA table_info(users)")
        cols = {row[1] for row in cur.fetchall()}

        # 3. Определяем нужные миграции
        alters: list[str] = []
        if "is_premium" not in cols:
            alters.append("ALTER TABLE users ADD COLUMN is_premium BOOLEAN NOT NULL DEFAULT 0")
        if "referral_code" not in cols:
            alters.append("ALTER TABLE users ADD COLUMN referral_code TEXT")
        if "referred_by" not in cols:
            alters.append("ALTER TABLE users ADD COLUMN referred_by INTEGER")
            if "premium_until" not in cols:
                alters.append("ALTER TABLE users ADD COLUMN premium_until TIMESTAMP")

        # 4. Применяем миграции
        if alters:
            for sql in alters:
                try:
                    cur.execute(sql)
                    print(f"Migration: {sql}")
                except sqlite3.OperationalError as e:
                    print(f"Migration skipped: {sql} -> {e}")
            conn.commit()
        else:
            print("DB schema up to date")

        conn.close()
    except Exception as e:
        print(f"DB migration error (non-critical): {e}")