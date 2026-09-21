-- Runs once, on first initialisation of the database volume.
-- apps/ai stores RAG embeddings in the same database as the relational data
-- (knowledge_item_chunks.embedding), so the vector type must exist before
-- the schema is created.
CREATE EXTENSION IF NOT EXISTS vector;
