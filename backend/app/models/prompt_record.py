from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class PromptRecord(Base):
    __tablename__ = "prompt_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    goal: Mapped[str] = mapped_column(String(500), nullable=False)
    stack: Mapped[str] = mapped_column(String(200), nullable=False)
    constraints: Mapped[str] = mapped_column(Text, nullable=False, default="")
    style: Mapped[str] = mapped_column(String(120), nullable=False)
    output_format: Mapped[str] = mapped_column(String(120), nullable=False)
    final_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    short_summary: Mapped[str] = mapped_column(String(500), nullable=False)
    tags: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
