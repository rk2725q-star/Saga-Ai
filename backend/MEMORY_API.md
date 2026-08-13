# SAGE Memory API

## Base URL

http://127.0.0.1:8000

## Create Memory

POST /memory

Creates a memory and automatically generates a Gemini embedding.

## Get User Memories

GET /memory/{user_id}

Returns memories belonging to a user.

## Update Memory

PUT /memory/{memory_id}

Updates an existing memory.

## Delete Memory

DELETE /memory/{memory_id}

Deletes a memory.

## Semantic Memory Search

GET /memory/relevant/{user_id}?q=...

Searches memories using Gemini embeddings and pgvector cosine similarity.

Example:

GET /memory/relevant/{user_id}?q=I%20am%20having%20trouble%20sleeping

Returns relevant memories with similarity scores.

## Technology

- FastAPI
- PostgreSQL 18
- SQLAlchemy
- pgvector
- Gemini Embeddings
- gemini-embedding-001
- 768-dimensional vectors