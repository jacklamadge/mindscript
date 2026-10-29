from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas_library import (
    CollectionCreate,
    CollectionItemCreate,
    CollectionItemOut,
    CollectionOut,
    LibraryItemCreate,
    LibraryItemOut,
    LibraryMigrateRequest,
    LibraryStatsOut,
)
from app.services import library_service as lib

router = APIRouter(prefix="/api/library", tags=["library"])


def _user_id(x_user_id: int | None = Header(None, alias="X-User-Id")) -> int:
    if x_user_id is None or x_user_id < 1:
        raise HTTPException(status_code=401, detail="X-User-Id header required.")
    return x_user_id


@router.get("/history", response_model=list[LibraryItemOut])
def get_history(user_id: int = Depends(_user_id), db: Session = Depends(get_db)):
    return lib.list_history(db, user_id)


@router.post("/history", response_model=LibraryItemOut)
def post_history(
    body: LibraryItemCreate,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    return lib.add_history(db, user_id, body)


@router.delete("/history/{item_id}")
def delete_history(
    item_id: int,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    if not lib.delete_history_item(db, user_id, item_id):
        raise HTTPException(status_code=404, detail="History item not found.")
    return {"ok": True}


@router.get("/favorites", response_model=list[LibraryItemOut])
def get_favorites(user_id: int = Depends(_user_id), db: Session = Depends(get_db)):
    return lib.list_favorites(db, user_id)


@router.post("/favorites", response_model=LibraryItemOut)
def post_favorite(
    body: LibraryItemCreate,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    return lib.add_favorite(db, user_id, body)


@router.delete("/favorites/{item_id}")
def delete_favorite(
    item_id: int,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    if not lib.delete_favorite_item(db, user_id, item_id):
        raise HTTPException(status_code=404, detail="Favorite not found.")
    return {"ok": True}


@router.get("/collections", response_model=list[CollectionOut])
def get_collections(user_id: int = Depends(_user_id), db: Session = Depends(get_db)):
    return lib.list_collections(db, user_id)


@router.post("/collections", response_model=CollectionOut)
def post_collection(
    body: CollectionCreate,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    return lib.create_collection(db, user_id, body)


@router.delete("/collections/{collection_id}")
def delete_collection(
    collection_id: int,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    if not lib.delete_collection(db, user_id, collection_id):
        raise HTTPException(status_code=404, detail="Collection not found.")
    return {"ok": True}


@router.post("/collections/{collection_id}/items", response_model=CollectionItemOut)
def post_collection_item(
    collection_id: int,
    body: CollectionItemCreate,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    item = lib.add_collection_item(db, user_id, collection_id, body)
    if item is None:
        raise HTTPException(status_code=404, detail="Collection not found.")
    return item


@router.delete("/collections/{collection_id}/items/{item_id}")
def delete_collection_item(
    collection_id: int,
    item_id: int,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    if not lib.delete_collection_item(db, user_id, collection_id, item_id):
        raise HTTPException(status_code=404, detail="Item not found.")
    return {"ok": True}


@router.get("/stats", response_model=LibraryStatsOut)
def get_stats(user_id: int = Depends(_user_id), db: Session = Depends(get_db)):
    return lib.get_stats(db, user_id)


@router.post("/migrate")
def migrate(
    body: LibraryMigrateRequest,
    user_id: int = Depends(_user_id),
    db: Session = Depends(get_db),
):
    lib.migrate_local_data(db, user_id, body)
    return {"ok": True}



# --- Умные шаблоны: топ-категория пользователя по истории генераций ---
@router.get("/top-category")
def top_category(user_id: int = 0, db: Session = Depends(get_db)):
    from sqlalchemy import text as _t
    rows = db.execute(
        _t("SELECT (COALESCE(goal,'') || ' ' || COALESCE(tags,'') || ' ' || COALESCE(final_prompt,'')) AS t FROM prompt_records WHERE user_id = :u"),
        {"u": user_id},
    ).fetchall()
    DEV = ['бот','код','api','python','лендинг','сайт','mvp','парсер','docker','sql','fastapi','aiogram','javascript','html','разработ','архитектур','приложени','backend','frontend','swagger']
    PROMO = ['пост','реклам','оффер','продвиж','маркет','таргет','продаж','текст','контент','анонс','smm','блог','подписчик','сторис','рассылк','креатив','запуск','аудитори']
    dev = 0
    promo = 0
    for (t,) in rows:
        s = (t or '').lower()
        d = sum(1 for w in DEV if w in s)
        p = sum(1 for w in PROMO if w in s)
        if d > p:
            dev += 1
        elif p > d:
            promo += 1
    if dev + promo == 0:
        return {"top_category": None}
    return {"top_category": "dev" if dev >= promo else "promo"}