from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app import memory
from app.embedding import generate_embedding, build_memory_text
from app.database import get_db
from app.models import HealthMemory
from app.memory.schemas import (
    MemoryCreate,
    MemoryResponse,
    MemoryUpdate,
    RelevantMemoryResponse
)

from sqlalchemy import Float
from sqlalchemy.sql import func

MEMORY_SIMILARITY_THRESHOLD = 0.60

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
    memory_text = build_memory_text(
        memory.category,
        memory.key,
        memory.value
    )

    embedding = generate_embedding(memory_text)

    new_memory = HealthMemory(
        user_id=memory.user_id,
        category=memory.category,
        key=memory.key,
        value=memory.value,
        source=memory.source,
        confidence=memory.confidence,
        embedding=embedding
    )

    db.add(new_memory)
    db.commit()
    db.refresh(new_memory)

    return new_memory


@router.get(
    "/relevant/{user_id}",
    response_model=list[RelevantMemoryResponse]
)
def get_relevant_memories(
    user_id: UUID,
    q: str = Query(
    min_length=2,
    max_length=500
),
    limit: int = Query(
        default=5,
        ge=1,
        le=20
    ),
    db: Session = Depends(get_db)
):
    query_embedding = generate_embedding(q)

    distance = HealthMemory.embedding.cosine_distance(
        query_embedding
    )

    memories = (
        db.query(
            HealthMemory,
            (1 - distance).label("similarity")
        )
        .filter(
            HealthMemory.user_id == user_id,
            HealthMemory.embedding.isnot(None)
        )
        .order_by(distance)
        .limit(limit)
        .all()
    )

    results = []

    for memory, similarity in memories:

        similarity = float(similarity)

        if similarity >= MEMORY_SIMILARITY_THRESHOLD:
            results.append(
                RelevantMemoryResponse(
                    id=memory.id,
                    user_id=memory.user_id,
                    category=memory.category,
                    key=memory.key,
                    value=memory.value,
                    source=memory.source,
                    confidence=memory.confidence,
                    similarity=similarity
                )
            )

    return results

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


