from app.database import SessionLocal
from app.models import HealthMemory
from app.embedding import (
    generate_embedding,
    build_memory_text
)


def backfill_embeddings():

    db = SessionLocal()

    try:
        memories = (
            db.query(HealthMemory)
            .filter(
                HealthMemory.embedding.is_(None)
            )
            .all()
        )

        print(
            f"Found {len(memories)} memories "
            "without embeddings."
        )

        for memory in memories:

            text = build_memory_text(
                memory.category,
                memory.key,
                memory.value
            )

            print(
                f"Generating embedding for "
                f"{memory.id}..."
            )

            memory.embedding = generate_embedding(text)

            db.commit()

            print(
                f"Completed {memory.id}"
            )

        print("Backfill complete.")

    finally:
        db.close()


if __name__ == "__main__":
    backfill_embeddings()