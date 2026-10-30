from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.db import get_db
from app.rate_limit import check_rate_limit
from app.schemas import BotPromptRequest, BotPromptResponse
from app.services.bot_prompt_mapper import answers_to_generate_request
from app.schemas_library import LibraryItemCreate
from app.services import library_service
from app.services.prompt_generation import generate_and_persist
from app.models.user import User
from app.schemas import BotPromptRequest, BotPromptResponse, PromptImproveRequest
router = APIRouter(prefix="/api/prompt", tags=["prompt"])
from app.services.tg_notify import send_tg_message
from app.config import settings as app_settings
from app.services.llm_client import LLMClient

@router.post("/save", response_model=BotPromptResponse)
def save_prompt(body: BotPromptRequest, request: Request, db: Session = Depends(get_db)):
        # 🛡️ Серверная проверка лимита
    from app.services.limits import spend_generation
    limit = spend_generation(db, body.userId)
    # === Обход лимитов для админов ===
    _is_admin = False
    try:
        _user = db.get(User, body.userId) if body.userId else None
        if _user and _user.email and _user.email.startswith("tg_"):
            _tg = int(_user.email.split("@")[0].replace("tg_", ""))
            _is_admin = _tg in {5189141840, 8498252327, 1678182897, 1682568190}
    except Exception:
        pass
    # ================================

    if not limit["ok"] and not _is_admin:
        raise HTTPException(
            status_code=402,
            detail="Лимит генераций исчерпан. Продлите: промокод, Premium или заходите завтра!",
        )
    """
    Endpoint для фронта VIBEPROMT (dataSender.js).
    Принимает JSON из квиза и генерирует промпт через LLM.
    """
    if body.type != "prompt":
        raise HTTPException(status_code=400, detail='Only type "prompt" is supported.')
    
    try:
        generate_request = answers_to_generate_request(body.data)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc

    # === ПРОВЕРКА ЛИМИТА НА СЕРВЕРЕ (второй раз не списываем — уже в spend_generation) ===
    if body.userId and not app_settings.unlimited_resources:
        user = db.get(User, body.userId)
        if user and user.generations_left <= 0 and not _is_admin:
            raise HTTPException(
                status_code=403,
                detail="Лимит генераций исчерпан. Зарегистрируйтесь или перейдите на Premium."
            )
    # ====================================

    check_rate_limit(request.client.host if request.client else "unknown")
    
    result = generate_and_persist(
        db,
        generate_request,
        user_id=body.userId,
        session_id=body.sessionId,
    )
    
    title = result.short_summary or result.final_prompt[:50]
    if len(result.final_prompt) > 50 and not result.short_summary:
        title += "..."
        
    library_service.add_history(
        db,
        body.userId,
        LibraryItemCreate(
            title=title,
            text=result.final_prompt,
            prompt_record_id=result.id,
        ),
    )

    notify_chat = request.headers.get("X-Notify-Chat", "")
    if notify_chat.isdigit():
        send_tg_message(
            int(notify_chat),
            "✅ Ваш промпт готов! Заберите его в MindScript.",
            app_settings.mini_app_url,
        )
    return BotPromptResponse(
        generations_left=limit["left"],
        userId=body.userId,
        sessionId=body.sessionId,
        id=result.id,
        final_prompt=result.final_prompt,
        short_summary=result.short_summary,
        tags=result.tags,
        source=result.source,
        llm_error=result.llm_error,
    )
@router.post("/improve")
def improve_prompt(body: PromptImproveRequest, request: Request):
    """Улучшает существующий промпт через LLM"""
    check_rate_limit(request.client.host if request.client else "unknown")
    instruction = (
        "Ты — эксперт по промпт-инжинирингу. Улучши предоставленный промпт на русском языке: "
        "сделай его более длинным, структурированным и эффективным. "
        "В начале обязательно оставь или усиль роль («Ты — профессиональный...»). "
        "Выведи ТОЛЬКО улучшенный промпт, без markdown-обёрток и комментариев.\n\n"
        f"Исходный промпт:\n{body.original_prompt}\n\n"
        f"Пожелание пользователя: {body.user_comment or 'Общее улучшение структуры и детализации.'}"
    )
    raw, err = LLMClient().generate_from_instruction(instruction)
    if err or not raw:
        raise HTTPException(status_code=502, detail=err or "Не удалось улучшить промпт")
    return {"improved_prompt": raw.strip()}