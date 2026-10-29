from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LibraryItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    text: str
    date: datetime
    prompt_record_id: int | None = None


class LibraryItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1, max_length=50000)
    prompt_record_id: int | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        t = value.strip() or "Промпт"
        if len(t) > 300:
            return t[:297] + "..."
        return t


class CollectionItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    text: str
    date: datetime
    prompt_record_id: int | None = None


class CollectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    items: list[CollectionItemOut] = Field(default_factory=list)


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class CollectionItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1, max_length=50000)
    prompt_record_id: int | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        t = value.strip() or "Промпт"
        if len(t) > 300:
            return t[:297] + "..."
        return t


class CollectionMigrate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    items: list[LibraryItemCreate] = Field(default_factory=list)


class LibraryMigrateRequest(BaseModel):
    history: list[LibraryItemCreate] = Field(default_factory=list)
    favorites: list[LibraryItemCreate] = Field(default_factory=list)
    collections: list[CollectionMigrate] = Field(default_factory=list)


class LibraryStatsOut(BaseModel):
    history_count: int
    favorites_count: int
    collections_count: int
    prompts_total: int
