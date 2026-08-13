from uuid import UUID

from pydantic import BaseModel, Field


class MemoryCreate(BaseModel):
    user_id: UUID
    category: str
    key: str
    value: str
    source: str = "conversation"
    confidence: float | None = Field(
        default=None,
        ge=0,
        le=1
    )


class MemoryResponse(BaseModel):
    id: UUID
    user_id: UUID
    category: str
    key: str
    value: str
    source: str
    confidence: float | None

class MemoryUpdate(BaseModel):
    category: str | None = None
    key: str | None = None
    value: str | None = None
    source: str | None = None
    confidence: float | None = Field(
        default=None,
        ge=0,
        le=1
    )