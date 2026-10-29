from app.models.user import User
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas_auth import AuthResponse, LoginRequest, RegisterRequest, UserSettingsUpdate
from app.services.auth_service import AuthError, get_user, login, register, update_settings, activate_premium,_expire_trial_premium
from app.schemas_auth import ApplyReferralRequest  # (добавьте к существующему импорту)
from app.services.auth_service import apply_referral 
import json as _json
import httpx
from app.config import settings
import json
from pydantic import BaseModel
import httpx
from app.config import settings
from app.services.auth_service import telegram_auto_login  # ← добавьте в существующий import


class CreateInvoiceRequest(BaseModel):  # можно вынести в schemas_auth
    plan: str = "premium"

router = APIRouter(prefix="/api/auth", tags=["auth"])
def _user_id_header(x_user_id: int | None = Header(None, alias="X-User-Id")) -> int:
    if x_user_id is None or x_user_id < 1:
        raise HTTPException(status_code=401, detail="X-User-Id header required.")
    return x_user_id

@router.post("/register", response_model=AuthResponse)
def register_user(body: RegisterRequest, db: Session = Depends(get_db)):
    try:
        return register(db, body)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

@router.post("/login", response_model=AuthResponse)
def login_user(body: LoginRequest, db: Session = Depends(get_db)):
    try:
        return login(db, body)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

@router.get("/me", response_model=AuthResponse)
def me(user_id: int = Depends(_user_id_header), db: Session = Depends(get_db)):
    try:
        user = db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден.")

        # Гасим просроченный trial Premium
        try:
            from app.services.auth_service import _expire_trial_premium
            _expire_trial_premium(db, user)
            db.commit()
        except Exception as e:
            print("⚠️ expire_trial:", e)

        profile = get_user(db, user_id)

        # Список админов по Telegram-ID
        ADMIN_TELEGRAM_IDS = {5189141840, 8498252327, 1678182897, 1682568190,5955260280}
        try:
            tg_id = int(user.email.split("@")[0].replace("tg_", ""))
        except Exception:
            tg_id = 0
        profile.is_admin = tg_id in ADMIN_TELEGRAM_IDS

        return profile

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/settings", response_model=AuthResponse)
def patch_settings(
    body: UserSettingsUpdate,
    user_id: int = Depends(_user_id_header),
    db: Session = Depends(get_db),
):
    try:
        return update_settings(db, user_id, body)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

# 🆕 НОВЫЙ ЭНДПОИНТ: АКТИВАЦИЯ PREMIUM
@router.post("/subscribe", response_model=AuthResponse)
def subscribe(user_id: int = Depends(_user_id_header), db: Session = Depends(get_db)):
    """Активирует Premium (демо-версия, без реальной оплаты)"""
    try:
        return activate_premium(db, user_id)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

@router.post("/apply-referral", response_model=AuthResponse)
def apply_referral_endpoint(
    body: ApplyReferralRequest,
    user_id: int = Depends(_user_id_header),
    db: Session = Depends(get_db),
):
    try:
        return apply_referral(db, user_id, body.referral_code)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
PREMIUM_PRICE_STARS = 150

class CreateInvoiceRequest(BaseModel):
    plan: str = "premium"

@router.post("/create-invoice")
def create_invoice(
    body: CreateInvoiceRequest,
    user_id: int = Depends(_user_id_header),
):
    """Создаёт счёт на оплату Premium за Telegram Stars"""
    if not settings.bot_token:
        raise HTTPException(status_code=500, detail="Не настроен BOT_TOKEN в .env")
    
    resp = httpx.post(
        f"https://api.telegram.org/bot{settings.bot_token}/createInvoiceLink",
        json={
            "title": "MindScript Premium",
            "description": "Безлимитные генерации промптов — навсегда",
            "payload": json.dumps({"user_id": user_id, "plan": body.plan}),
            "currency": "XTR",
            "prices": [{"label": "Premium", "amount": PREMIUM_PRICE_STARS}],
        },
        timeout=15,
    )
    data = resp.json()
    if not data.get("ok"):
        raise HTTPException(status_code=502, detail=str(data.get("description")))
    return {"invoice_link": data["result"]}    
class TelegramLoginRequest(BaseModel):
    telegram_user: dict

@router.post("/telegram-login", response_model=AuthResponse)
def telegram_login(body: TelegramLoginRequest):
    """
    Автоматический вход/регистрация через Telegram.
    Требует валидный initData в заголовке X-Telegram-Init-Data.
    """
    # initData уже проверен в _telegram_user_id (но мы не используем Depends — 
    # проверка делается внутри extract_user_id)
    db = next(get_db())
    try:
        return telegram_auto_login(db, body.telegram_user)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


# --- Аватарка из Telegram через Bot API ---
_AVATAR_CACHE = {}

@router.get("/avatar")
def get_avatar(user_id: int = Depends(_user_id_header), db: Session = Depends(get_db), refresh: int = 0):
    import json as _json
    import time as _time
    import urllib.request as _urllib
    from app.config import settings as _settings

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден.")
    try:
        tg_id = int(user.email.split("@")[0].replace("tg_", ""))
    except Exception:
        return {"avatar_url": None}

    now = _time.time()
    cached = _AVATAR_CACHE.get(tg_id)
    if cached and not refresh and now - cached[0] < 3600:
        return {"avatar_url": cached[1]}

    avatar_url = None
    try:
        token = _settings.bot_token
        with _urllib.urlopen(f"https://api.telegram.org/bot{token}/getUserProfilePhotos?user_id={tg_id}&limit=1", timeout=10) as r:
            data = _json.load(r)
        photos = data.get("result", {}).get("photos", [])
        if photos:
            file_id = photos[0][-1]["file_id"]
            with _urllib.urlopen(f"https://api.telegram.org/bot{token}/getFile?file_id={file_id}", timeout=10) as r2:
                data2 = _json.load(r2)
            file_path = data2.get("result", {}).get("file_path")
            if file_path:
                avatar_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
    except Exception as e:
        print("⚠️ avatar:", e)

    _AVATAR_CACHE[tg_id] = (now, avatar_url)
    return {"avatar_url": avatar_url}