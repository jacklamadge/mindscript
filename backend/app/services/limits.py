"""Серверные лимиты генераций — источник правды в БД"""
import secrets
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.auth_service import _expire_trial_premium
from app.services.passwords import hash_password


def get_or_create_user(db: Session, user_id: int) -> User:
    """Находит пользователя или создаёт гостевую запись"""
    user = db.get(User, user_id)
    if user:
        return user
    user = User(
        id=user_id,
        email=f"guest_{user_id}@vibepromt.local",
        password_hash=hash_password(secrets.token_urlsafe(16)),
        display_name=f"Guest {user_id}",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def spend_generation(db: Session, user_id: int) -> dict:
    """
    Проверяет и списывает 1 генерацию НА СЕРВЕРЕ.
    Возвращает {'ok': bool, 'left': int, 'is_premium': bool}
    """
    user = get_or_create_user(db, user_id)
    _expire_trial_premium(db, user)

    # Premium — безлимит, не списываем
    if user.is_premium:
        return {"ok": True, "left": 9999, "is_premium": True}

    # Лимит исчерпан
    if user.generations_left <= 0:
        return {"ok": False, "left": 0, "is_premium": False}

    # Списание
    user.generations_left -= 1
    db.commit()
    db.refresh(user)
    return {"ok": True, "left": user.generations_left, "is_premium": False}