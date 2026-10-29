from datetime import datetime
from sqlalchemy import DateTime, Integer, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    tokens_left: Mapped[int] = mapped_column(Integer, nullable=False, default=125, server_default="125")
    generations_left: Mapped[int] = mapped_column(Integer, nullable=False, default=5, server_default="5")
    is_premium: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    premium_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    referral_code: Mapped[str | None] = mapped_column(String(12), unique=True, nullable=True, index=True)
    referred_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )