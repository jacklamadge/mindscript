from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import Integer, String, Text, DateTime, func, select
from sqlalchemy.orm import Mapped, mapped_column, Session

from app.db import Base, get_db
from app.models.user import User

router = APIRouter(prefix="/community", tags=["community"])


class CommunityPrompt(Base):
    __tablename__ = "community_prompts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    author_id: Mapped[int] = mapped_column(Integer, nullable=False)
    author_name: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    likes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PublishIn(BaseModel):
    title: str
    content: str
    category: str | None = None


@router.post("")
def publish(body: PublishIn, db: Session = Depends(get_db), x_user_id: str = Header(default="")):
    if not body.title.strip() or not body.content.strip():
        raise HTTPException(status_code=400, detail="Заголовок и текст обязательны")
    uid = int(x_user_id or 0)
    user = db.get(User, uid) if uid else None
    name = user.display_name if user else "Аноним"
    rec = CommunityPrompt(
        author_id=uid, author_name=name,
        title=body.title.strip()[:200], content=body.content.strip(),
        category=body.category,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"ok": True, "id": rec.id}


@router.get("")
def list_prompts(db: Session = Depends(get_db)):
    rows = db.execute(
        select(CommunityPrompt).order_by(CommunityPrompt.id.desc()).limit(100)
    ).scalars().all()
    return [{
        "id": r.id, "author": r.author_name, "title": r.title,
        "content": r.content, "category": r.category, "likes": r.likes,
    } for r in rows]


@router.post("/{prompt_id}/like")
def like(prompt_id: int, db: Session = Depends(get_db)):
    rec = db.get(CommunityPrompt, prompt_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Не найдено")
    rec.likes += 1
    db.commit()
    return {"ok": True, "likes": rec.likes}
