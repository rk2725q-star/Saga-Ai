from app.embedding import generate_embedding


text = "I am allergic to penicillin."

embedding = generate_embedding(text)

print("Embedding generated successfully!")
print("Dimension:", len(embedding))
print("First 5 values:", embedding[:5])