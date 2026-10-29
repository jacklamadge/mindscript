from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class BotPromptData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    category: str = ""
    answers: dict[str, str] = Field(default_factory=dict)


class BotPromptRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    userId: int
    sessionId: str
    type: str = "prompt"
    timestamp: datetime | None = None
    data: BotPromptData


class BotPromptResponse(BaseModel):
    generations_left: int | None = None
    userId: int
    sessionId: str
    id: int
    final_prompt: str
    short_summary: str
    tags: list[str]
    source: Literal["llm", "template"]
    llm_error: str | None = None


class PromptGenerateRequest(BaseModel):
    goal: str = Field(min_length=10, max_length=500)
    stack: str = Field(min_length=2, max_length=200)
    constraints: str = Field(default="", max_length=2000)
    style: str = Field(min_length=2, max_length=120)
    output_format: str = Field(min_length=2, max_length=120)


class PromptGenerateResponse(BaseModel):
    id: int
    final_prompt: str
    short_summary: str
    tags: list[str]
    source: Literal["llm", "template"]
    llm_error: str | None = None


class PromptImproveRequest(BaseModel):
    original_prompt: str = Field(min_length=10, max_length=50000)
    user_comment: str = Field(default="", max_length=500)
 