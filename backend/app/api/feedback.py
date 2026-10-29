import httpx
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import Integer, String, Text, DateTime, func, select
from sqlalchemy.orm import Mapped, mapped_column, Session

from app.config import settings
from app.db import Base, get_db
from app.models.user import User

router = APIRouter(prefix="/api", tags=["feedback"])


class Review(Base):
    __tablename__ = "reviews"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ReviewIn(BaseModel):
    rating: int
    text: str


class SupportIn(BaseModel):
    text: str


def _send_admin(text: str):
    if not settings.bot_token or not settings.admin_telegram_id:
        return
    try:
        httpx.post(
            f"https://api.telegram.org/bot{settings.bot_token}/sendMessage",
            json={"chat_id": int(settings.admin_telegram_id), "text": text},
            timeout=10,
        )
    except Exception as e:
        print("feedback notify:", e)


@router.post("/reviews")
def add_review(body: ReviewIn, db: Session = Depends(get_db), x_user_id: str = Header(default="")):
    if not (1 <= body.rating <= 5) or not body.text.strip():
        raise HTTPException(status_code=400, detail="Оценка 1–5 и текст обязательны")
    uid = int(x_user_id or 0)
    user = db.get(User, uid) if uid else None
    name = user.display_name if user else "Аноним"
    db.add(Review(user_id=uid, user_name=name, rating=body.rating, text=body.text.strip()[:500]))
    db.commit()
    _send_admin(f"⭐ Новый отзыв {body.rating}/5 от {name}:\n{body.text.strip()[:300]}")
    return {"ok": True}


@router.get("/reviews")
def list_reviews(db: Session = Depends(get_db)):
    rows = db.execute(select(Review).order_by(Review.id.desc()).limit(50)).scalars().all()
    return [{"name": r.user_name, "rating": r.rating, "text": r.text} for r in rows]


@router.post("/support")
def support(body: SupportIn, db: Session = Depends(get_db), x_user_id: str = Header(default="")):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Пустое сообщение")
    uid = int(x_user_id or 0)
    user = db.get(User, uid) if uid else None
    name = user.display_name if user else "Аноним"
    _send_admin(f"📩 Поддержка от {name} (id {uid}):\n{body.text.strip()[:500]}")
    return {"ok": True}
