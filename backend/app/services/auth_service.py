import re
import secrets
import string
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from app.models.collection import Collection, CollectionItem
from app.models.library_item import LibraryItem
from app.models.prompt_record import PromptRecord
from app.models.user import User
from app.schemas_auth import AuthResponse, LoginRequest, RegisterRequest, UserSettingsUpdate
from app.services.passwords import hash_password, verify_password
from datetime import datetime, timedelta, timezone
REFERRAL_BONUS = 2
REFERRAL_PREMIUM_DAYS = 1


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _expire_trial_premium(db: Session, user: User) -> None:
    """Пробный Premium сгорел → выключаем. Оплаченный Stars (premium_until=NULL) не трогаем."""
    if user.is_premium and user.premium_until is not None and user.premium_until <= _now_utc():
        user.is_premium = False
        user.premium_until = None
        db.commit()
        db.refresh(user)


def _grant_trial_premium(user: User, days: int = REFERRAL_PREMIUM_DAYS) -> None:
    now = _now_utc()
    base = user.premium_until if (user.premium_until and user.premium_until > now) else now
    user.premium_until = base + timedelta(days=days)
    user.is_premium = True

def _make_referral_code(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(6))
        exists = db.execute(select(User).where(User.referral_code == code)).scalar_one_or_none()
        if not exists:
            return code


def _referrals_count(db: Session, user_id: int) -> int:
    return db.execute(
        select(func.count()).select_from(User).where(User.referred_by == user_id)
    ).scalar_one()

def _make_referral_code(db: Session) -> str:
    """Случайный промокод из 6 символов, уникальный"""
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(6))
        exists = db.execute(
            select(User).where(User.referral_code == code)
        ).scalar_one_or_none()
        if not exists:
            return code

def _user_to_response(db: Session, user: User) -> AuthResponse:
    _expire_trial_premium(db, user)
    if not user.referral_code:
        user.referral_code = _make_referral_code(db)
        db.commit()
        db.refresh(user)
        # Генерируем промокод, если его ещё нет
    if not user.referral_code:
        user.referral_code = _make_referral_code(db)
        db.commit()
        db.refresh(user)
    return AuthResponse(
        premium_until=user.premium_until.isoformat() if user.premium_until else None,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        tokens_left=user.tokens_left,
        generations_left=user.generations_left,
        is_premium=getattr(user, "is_premium", False),
        referral_code=user.referral_code,
        referrals_count=_referrals_count(db, user.id),
    )


def _internal_email(display_name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", display_name.strip().lower()).strip("-") or "user"
    return f"{slug}.{secrets.token_hex(4)}@vibepromt.local"


def _find_by_display_name(db: Session, display_name: str) -> User | None:
    normalized = display_name.strip().lower()
    return db.execute(
        select(User).where(func.lower(User.display_name) == normalized)
    ).scalar_one_or_none()


def _migrate_user_data(db: Session, from_user_id: int, to_user_id: int) -> None:
    if from_user_id == to_user_id:
        return
    db.execute(update(LibraryItem).where(LibraryItem.user_id == from_user_id).values(user_id=to_user_id))
    db.execute(update(Collection).where(Collection.user_id == from_user_id).values(user_id=to_user_id))
    db.execute(update(PromptRecord).where(PromptRecord.user_id == from_user_id).values(user_id=to_user_id))
    db.commit()


def register(db: Session, payload: RegisterRequest) -> AuthResponse:
    display_name = payload.display_name.strip()
    if _find_by_display_name(db, display_name):
        raise AuthError("Это имя уже занято.", status_code=409)
    user = User(
        email=_internal_email(display_name),
        password_hash=hash_password(payload.password),
        display_name=display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    if payload.migrate_from_user_id and payload.migrate_from_user_id != user.id:
        _migrate_user_data(db, payload.migrate_from_user_id, user.id)
    return _user_to_response(db, user)


def login(db: Session, payload: LoginRequest) -> AuthResponse:
    user = _find_by_display_name(db, payload.display_name)
    if not user or not verify_password(payload.password, user.password_hash):
        raise AuthError("Неверное имя или пароль.", status_code=401)
    if payload.migrate_from_user_id and payload.migrate_from_user_id != user.id:
        _migrate_user_data(db, payload.migrate_from_user_id, user.id)
    return _user_to_response(db, user)


def get_user(db: Session, user_id: int) -> AuthResponse | None:
    user = db.get(User, user_id)
    if not user:
        return None
    return _user_to_response(db, user)


def update_settings(db: Session, user_id: int, payload: UserSettingsUpdate) -> AuthResponse:
    user = db.get(User, user_id)
    if not user:
        raise AuthError("Пользователь не найден.", status_code=404)
    if payload.tokens_left is not None:
        user.tokens_left = payload.tokens_left
    if payload.generations_left is not None:
        user.generations_left = payload.generations_left
    db.commit()
    db.refresh(user)
    return _user_to_response(db, user)


def activate_premium(db: Session, user_id: int) -> AuthResponse:
    user = db.get(User, user_id)
    if not user:
        raise AuthError("Пользователь не найден.", status_code=404)
    user.is_premium = True
    user.tokens_left = 99999
    user.generations_left = 9999
    db.commit()
    db.refresh(user)
    return _user_to_response(db, user)


def apply_referral(db: Session, user_id: int, code: str) -> AuthResponse:
    user = db.get(User, user_id)
    if not user:
        raise AuthError("Пользователь не найден.", status_code=404)

    # Если пробный Premium истёк — гасим его, коды снова доступны
    _expire_trial_premium(db, user)

    code = (code or "").strip().upper()
    referrer = db.execute(
        select(User).where(User.referral_code == code)
    ).scalar_one_or_none()
    if not referrer:
        raise AuthError("Код не найден.", status_code=404)
    if referrer.id == user.id:
        raise AuthError("Нельзя активировать свой код.", status_code=400)
    if user.referred_by == referrer.id:
        raise AuthError("Нельзя использовать промокод повторно.", status_code=400)
    if user.is_premium:
        raise AuthError(
            "Пока активен Premium, новый промокод ввести нельзя. "
            "Код станет доступен после окончания подписки.",
            status_code=400,
        )

    user.referred_by = referrer.id
    user.generations_left += REFERRAL_BONUS
    referrer.generations_left += REFERRAL_BONUS
    try:
        _grant_trial_premium(user)
        _grant_trial_premium(referrer)
    except Exception as e:
        print("⚠️ trial premium пропущен:", e)

    db.commit()
    db.refresh(user)
    return _user_to_response(db, user)
def telegram_auto_login(db: Session, telegram_user: dict) -> AuthResponse:
    """
    Автоматическая регистрация/логин пользователя Telegram.
    telegram_user: {'id': ..., 'first_name': ..., 'last_name': ..., 'username': ...}
    """
    tg_id = telegram_user.get("id")
    if not tg_id:
        raise AuthError("Нет Telegram user.id", status_code=400)
    
    email = f"tg_{tg_id}@vibepromt.local"
    display_name = (telegram_user.get("first_name") or "") + " " + (telegram_user.get("last_name") or "")
    display_name = display_name.strip() or (telegram_user.get("username") or f"User {tg_id}")
    
    # Ищем пользователя по Telegram ID (через email)
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    
    if user:
        # Обновляем имя, если изменилось
        if user.display_name != display_name:
            user.display_name = display_name
            db.commit()
            db.refresh(user)
        return _user_to_response(db, user)
    
    # Создаём нового пользователя (без пароля — вход только через Telegram)
    import secrets
    user = User(
        email=email,
        password_hash=hash_password(secrets.token_urlsafe(16)),  # случайный пароль
        display_name=display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_to_response(db, user)