import logging

from sqlalchemy.orm import Session

from app.models.prompt_record import PromptRecord
from app.schemas import PromptGenerateRequest, PromptGenerateResponse
from app.services.llm_client import LLMClient
from app.services.prompt_composer import PromptComposerService, PromptPayload

logger = logging.getLogger(__name__)
_MIN_LLM_PROMPT_CHARS = 120


def generate_and_persist(
    db: Session,
    payload: PromptGenerateRequest,
    user_id: int | None = None,
    session_id: str | None = None,
) -> PromptGenerateResponse:
    llm = LLMClient()
    composer = PromptComposerService()
    prompt_payload = PromptPayload(
        goal=payload.goal,
        stack=payload.stack,
        constraints=payload.constraints,
        style=payload.style,
        output_format=payload.output_format,
    )

    raw, llm_err = llm.generate_full_prompt(
        goal=payload.goal,
        stack=payload.stack,
        constraints=payload.constraints,
        style=payload.style,
        output_format=payload.output_format,
    )

    if raw and len(raw.strip()) >= _MIN_LLM_PROMPT_CHARS:
        final_prompt = raw.strip()
        llm_error = None
        source = "llm"
    else:
        final_prompt = composer.build_fallback_prompt(prompt_payload).strip()
        source = "template"
        parts: list[str] = [part for part in (llm_err,) if part]
        if raw:
            parts.append(
                f"Ответ слишком короткий ({len(raw.strip())} симв., нужно ≥{_MIN_LLM_PROMPT_CHARS})."
            )
        elif not parts:
            parts.append("Ответ модели не получен.")
        parts.append("Выдан резервный шаблон из ответов квиза.")
        llm_error = " ".join(parts)
        logger.warning("LLM failed, using template fallback: %s", llm_error)

    short_summary, tags = composer.summary_and_tags(prompt_payload)

    record = PromptRecord(
        user_id=user_id,
        session_id=session_id,
        goal=payload.goal,
        stack=payload.stack,
        constraints=payload.constraints,
        style=payload.style,
        output_format=payload.output_format,
        final_prompt=final_prompt,
        short_summary=short_summary,
        tags=",".join(tags),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return PromptGenerateResponse(
        id=record.id,
        final_prompt=record.final_prompt,
        short_summary=record.short_summary,
        tags=tags,
        source=source,
        llm_error=llm_error,
    )
