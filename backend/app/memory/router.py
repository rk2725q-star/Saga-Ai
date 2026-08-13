from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import HealthMemory
from app.memory.schemas import (
    MemoryCreate,
    MemoryResponse,
    MemoryUpdate,
)


router = APIRouter(
    prefix="/memory",
    tags=["Memory"]
)


@router.post(
    "",
    response_model=MemoryResponse
)
def create_memory(
    memory: MemoryCreate,
    db: Session = Depends(get_db)
):
    new_memory = HealthMemory(
        user_id=memory.user_id,
        category=memory.category,
        key=memory.key,
        value=memory.value,
        source=memory.source,
        confidence=memory.confidence
    )

    db.add(new_memory)
    db.commit()
    db.refresh(new_memory)

    return new_memory

@router.get(
    "/relevant/{user_id}",
    response_model=list[MemoryResponse]
)
def get_relevant_memories(
    user_id: UUID,
    q: str,
    db: Session = Depends(get_db)
):
    search_term = f"%{q.lower()}%"

    memories = (
        db.query(HealthMemory)
        .filter(
            HealthMemory.user_id == user_id,
            or_(
                HealthMemory.category.ilike(search_term),
                HealthMemory.key.ilike(search_term),
                HealthMemory.value.ilike(search_term)
            )
        )
        .order_by(HealthMemory.updated_at.desc())
        .limit(10)
        .all()
    )

    return memories

@router.get(
    "/{user_id}",
    response_model=list[MemoryResponse]
)
def get_memories(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    memories = (
        db.query(HealthMemory)
        .filter(HealthMemory.user_id == user_id)
        .order_by(HealthMemory.created_at.desc())
        .all()
    )

    return memories

@router.put(
    "/{memory_id}",
    response_model=MemoryResponse
)
def update_memory(
    memory_id: UUID,
    memory: MemoryUpdate,
    db: Session = Depends(get_db)
):
    existing_memory = (
        db.query(HealthMemory)
        .filter(HealthMemory.id == memory_id)
        .first()
    )

    if not existing_memory:
        raise HTTPException(
            status_code=404,
            detail="Memory not found"
        )

    if memory.category is not None:
        existing_memory.category = memory.category

    if memory.key is not None:
        existing_memory.key = memory.key

    if memory.value is not None:
        existing_memory.value = memory.value

    if memory.source is not None:
        existing_memory.source = memory.source

    if memory.confidence is not None:
        existing_memory.confidence = memory.confidence

    db.commit()
    db.refresh(existing_memory)

    return existing_memory

@router.delete(
    "/{memory_id}"
)
def delete_memory(
    memory_id: UUID,
    db: Session = Depends(get_db)
):
    memory = (
        db.query(HealthMemory)
        .filter(HealthMemory.id == memory_id)
        .first()
    )

    if not memory:
        raise HTTPException(
            status_code=404,
            detail="Memory not found"
        )

    db.delete(memory)
    db.commit()

    return {
        "message": "Memory deleted successfully"
    }