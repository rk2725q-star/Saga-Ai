from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine, Base
from app import models

from app.memory.router import router as memory_router

app = FastAPI(title="SAGE Memory Service")
app.include_router(memory_router)

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def root():
    return {
        "status": "SAGE memory service running"
    }


@app.get("/health/database")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "database": "connected"
        }

    except Exception as e:
        return {
            "database": "error",
            "detail": str(e)
        }