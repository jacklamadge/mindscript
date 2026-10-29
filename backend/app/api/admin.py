from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.services.telegram_auth import extract_user_id, TelegramAuthError

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _require_admin(x_telegram_init_data: str = Header(default="")) -> int:
    if not getattr(settings, "admin_telegram_id", ""):
        raise HTTPException(status_code=500, detail="ADMIN_TELEGRAM_ID не настроен")
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Нет initData")
    try:
        tg_id = extract_user_id(x_telegram_init_data)
    except TelegramAuthError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
    if str(tg_id) != str(settings.admin_telegram_id):
        raise HTTPException(status_code=403, detail="Доступ только для админа")
    return tg_id


def _cols(db: Session, table: str) -> set:
    """Список колонок таблицы (пусто, если таблицы нет)"""
    try:
        rows = db.execute(text(f"PRAGMA table_info({table})")).all()
        return {r[1] for r in rows}
    except Exception:
        return set()


def _q(db: Session, sql: str):
    """Безопасный запрос: при ошибке возвращает [] и пишет в лог"""
    try:
        return db.execute(text(sql)).all()
    except Exception as e:
        print(f"[admin] query failed: {sql} -> {e}")
        return []


def _one(db: Session, sql: str, default=0):
    rows = _q(db, sql)
    if rows and rows[0][0] is not None:
        return rows[0][0]
    return default


@router.get("/stats")
def get_stats(admin_id: int = Depends(_require_admin), db: Session = Depends(get_db)):
    u_cols = _cols(db, "users")
    p_cols = _cols(db, "prompt_records")

    # ===== ПОЛЬЗОВАТЕЛИ =====
    total_users = _one(db, "SELECT COUNT(*) FROM users")
    new_today = _one(db, "SELECT COUNT(*) FROM users WHERE date(created_at) = date('now')")
    new_week = _one(db, "SELECT COUNT(*) FROM users WHERE date(created_at) >= date('now','-7 days')")
    premium = _one(db, "SELECT COUNT(*) FROM users WHERE is_premium = 1") if "is_premium" in u_cols else 0
    via_ref = _one(db, "SELECT COUNT(*) FROM users WHERE referred_by IS NOT NULL") if "referred_by" in u_cols else 0

    # ===== ГЕНЕРАЦИИ =====
    total_prompts = _one(db, "SELECT COUNT(*) FROM prompt_records")
    prompts_today = _one(db, "SELECT COUNT(*) FROM prompt_records WHERE date(created_at) = date('now')")
    prompts_week = _one(db, "SELECT COUNT(*) FROM prompt_records WHERE date(created_at) >= date('now','-7 days')")

    # ===== ТОП КАТЕГОРИЙ =====
    top_categories = []
    if "category" in p_cols:
        rows = _q(db, """
            SELECT category, COUNT(*) n FROM prompt_records
            WHERE category IS NOT NULL GROUP BY category ORDER BY n DESC LIMIT 8
        """)
        top_categories = [{"category": r[0], "count": r[1]} for r in rows]

    # ===== ПО ИСТОЧНИКАМ LLM =====
    by_source = {}
    if "source" in p_cols:
        rows = _q(db, """
            SELECT source, COUNT(*) n FROM prompt_records
            WHERE source IS NOT NULL GROUP BY source
        """)
        by_source = {r[0]: r[1] for r in rows}

    # ===== ДИНАМИКА 30 ДНЕЙ =====
    ts_prompts = [
        {"day": r[0], "prompts": r[1]}
        for r in _q(db, """
            SELECT date(created_at) d, COUNT(*) FROM prompt_records
            WHERE date(created_at) >= date('now','-30 days') GROUP BY d ORDER BY d
        """)
    ]
    ts_users = [
        {"day": r[0], "users": r[1]}
        for r in _q(db, """
            SELECT date(created_at) d, COUNT(*) FROM users
            WHERE date(created_at) >= date('now','-30 days') GROUP BY d ORDER BY d
        """)
    ]

    return {
        "users": {
            "total": total_users,
            "new_today": new_today,
            "new_week": new_week,
            "premium": premium,
            "via_referral": via_ref,
        },
        "prompts": {
            "total": total_prompts,
            "today": prompts_today,
            "week": prompts_week,
            "by_source": by_source,
            "top_categories": top_categories,
        },
        "timeseries": {"prompts": ts_prompts, "users": ts_users},
        "admin_id": admin_id,
    }