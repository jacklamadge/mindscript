from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.collection import Collection, CollectionItem
from app.models.library_item import LibraryItem
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

_HISTORY = "history"
_FAVORITE = "favorite"
_MAX_HISTORY = 200
_MAX_FAVORITES = 100
_MAX_TITLE_LEN = 300


def _clip_title(title: str) -> str:
    t = title.strip() or "Промпт"
    if len(t) <= _MAX_TITLE_LEN:
        return t
    return t[: _MAX_TITLE_LEN - 3] + "..."


def _item_out(item: LibraryItem) -> LibraryItemOut:
    return LibraryItemOut(
        id=item.id,
        title=item.title,
        text=item.text,
        date=item.created_at,
        prompt_record_id=item.prompt_record_id,
    )


def _collection_item_out(item: CollectionItem) -> CollectionItemOut:
    return CollectionItemOut(
        id=item.id,
        title=item.title,
        text=item.text,
        date=item.created_at,
        prompt_record_id=item.prompt_record_id,
    )


def _collection_out(col: Collection) -> CollectionOut:
    return CollectionOut(
        id=col.id,
        name=col.name,
        items=[_collection_item_out(i) for i in sorted(col.items, key=lambda x: x.created_at, reverse=True)],
    )


def list_history(db: Session, user_id: int) -> list[LibraryItemOut]:
    rows = (
        db.execute(
            select(LibraryItem)
            .where(LibraryItem.user_id == user_id, LibraryItem.kind == _HISTORY)
            .order_by(LibraryItem.created_at.desc())
            .limit(_MAX_HISTORY)
        )
        .scalars()
        .all()
    )
    return [_item_out(r) for r in rows]


def list_favorites(db: Session, user_id: int) -> list[LibraryItemOut]:
    rows = (
        db.execute(
            select(LibraryItem)
            .where(LibraryItem.user_id == user_id, LibraryItem.kind == _FAVORITE)
            .order_by(LibraryItem.created_at.desc())
            .limit(_MAX_FAVORITES)
        )
        .scalars()
        .all()
    )
    return [_item_out(r) for r in rows]


def list_collections(db: Session, user_id: int) -> list[CollectionOut]:
    rows = (
        db.execute(
            select(Collection)
            .where(Collection.user_id == user_id)
            .options(selectinload(Collection.items))
            .order_by(Collection.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [_collection_out(r) for r in rows]


def add_history(
    db: Session,
    user_id: int,
    payload: LibraryItemCreate,
) -> LibraryItemOut:
    if payload.prompt_record_id is not None:
        existing = db.execute(
            select(LibraryItem).where(
                LibraryItem.user_id == user_id,
                LibraryItem.kind == _HISTORY,
                LibraryItem.prompt_record_id == payload.prompt_record_id,
            )
        ).scalar_one_or_none()
        if existing:
            return _item_out(existing)

    item = LibraryItem(
        user_id=user_id,
        kind=_HISTORY,
        title=_clip_title(payload.title),
        text=payload.text,
        prompt_record_id=payload.prompt_record_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    _trim_kind(db, user_id, _HISTORY, _MAX_HISTORY)
    return _item_out(item)


def add_favorite(db: Session, user_id: int, payload: LibraryItemCreate) -> LibraryItemOut:
    if payload.prompt_record_id is not None:
        existing = db.execute(
            select(LibraryItem).where(
                LibraryItem.user_id == user_id,
                LibraryItem.kind == _FAVORITE,
                LibraryItem.prompt_record_id == payload.prompt_record_id,
            )
        ).scalar_one_or_none()
        if existing:
            return _item_out(existing)

    item = LibraryItem(
        user_id=user_id,
        kind=_FAVORITE,
        title=_clip_title(payload.title),
        text=payload.text,
        prompt_record_id=payload.prompt_record_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    _trim_kind(db, user_id, _FAVORITE, _MAX_FAVORITES)
    return _item_out(item)


def delete_history_item(db: Session, user_id: int, item_id: int) -> bool:
    item = db.get(LibraryItem, item_id)
    if not item or item.user_id != user_id or item.kind != _HISTORY:
        return False
    db.delete(item)
    db.commit()
    return True


def delete_favorite_item(db: Session, user_id: int, item_id: int) -> bool:
    item = db.get(LibraryItem, item_id)
    if not item or item.user_id != user_id or item.kind != _FAVORITE:
        return False
    db.delete(item)
    db.commit()
    return True


def create_collection(db: Session, user_id: int, payload: CollectionCreate) -> CollectionOut:
    col = Collection(user_id=user_id, name=payload.name.strip())
    db.add(col)
    db.commit()
    db.refresh(col)
    return _collection_out(col)


def delete_collection(db: Session, user_id: int, collection_id: int) -> bool:
    col = db.get(Collection, collection_id)
    if not col or col.user_id != user_id:
        return False
    db.delete(col)
    db.commit()
    return True


def add_collection_item(
    db: Session,
    user_id: int,
    collection_id: int,
    payload: CollectionItemCreate,
) -> CollectionItemOut | None:
    col = db.get(Collection, collection_id)
    if not col or col.user_id != user_id:
        return None
    item = CollectionItem(
        collection_id=collection_id,
        title=_clip_title(payload.title),
        text=payload.text,
        prompt_record_id=payload.prompt_record_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _collection_item_out(item)


def delete_collection_item(
    db: Session, user_id: int, collection_id: int, item_id: int
) -> bool:
    col = db.get(Collection, collection_id)
    if not col or col.user_id != user_id:
        return False
    item = db.get(CollectionItem, item_id)
    if not item or item.collection_id != collection_id:
        return False
    db.delete(item)
    db.commit()
    return True


def get_stats(db: Session, user_id: int) -> LibraryStatsOut:
    history_count = db.execute(
        select(func.count()).select_from(LibraryItem).where(
            LibraryItem.user_id == user_id, LibraryItem.kind == _HISTORY
        )
    ).scalar_one()
    favorites_count = db.execute(
        select(func.count()).select_from(LibraryItem).where(
            LibraryItem.user_id == user_id, LibraryItem.kind == _FAVORITE
        )
    ).scalar_one()
    collections = (
        db.execute(select(Collection).where(Collection.user_id == user_id).options(selectinload(Collection.items)))
        .scalars()
        .all()
    )
    items_in_cols = sum(len(c.items) for c in collections)
    return LibraryStatsOut(
        history_count=history_count,
        favorites_count=favorites_count,
        collections_count=len(collections),
        prompts_total=history_count + favorites_count + items_in_cols,
    )


def migrate_local_data(db: Session, user_id: int, payload: LibraryMigrateRequest) -> None:
    for entry in payload.history:
        add_history(db, user_id, entry)
    for entry in payload.favorites:
        add_favorite(db, user_id, entry)
    for col_data in payload.collections:
        col = Collection(user_id=user_id, name=col_data.name.strip())
        db.add(col)
        db.commit()
        db.refresh(col)
        for entry in col_data.items:
            add_collection_item(
                db,
                user_id,
                col.id,
                CollectionItemCreate(
                    title=entry.title,
                    text=entry.text,
                    prompt_record_id=entry.prompt_record_id,
                ),
            )


def _trim_kind(db: Session, user_id: int, kind: str, limit: int) -> None:
    rows = (
        db.execute(
            select(LibraryItem)
            .where(LibraryItem.user_id == user_id, LibraryItem.kind == kind)
            .order_by(LibraryItem.created_at.desc())
        )
        .scalars()
        .all()
    )
    for extra in rows[limit:]:
        db.delete(extra)
    if len(rows) > limit:
        db.commit()
