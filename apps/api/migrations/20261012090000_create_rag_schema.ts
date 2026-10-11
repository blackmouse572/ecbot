import { Migration } from '@mikro-orm/migrations';

// The knowledge tables are raw SQL that apps/ai reads and writes; MikroORM has
// no entity for them (see `skipTables`). Nothing created them on deploy: the
// AI service's own `ensure_schema()` only runs from a startup hook that is not
// wired in (#12), so a fresh database had no `rag_documents` and every
// knowledge item failed. They are created here so the deploy's migrate step
// owns them like every other table.
//
// Idempotent, because databases set up by hand or by a local run of the AI
// service already have them. The vector size matches RAG_EMBEDDING_DIMENSION
// (768); changing the embedding size needs a new migration.
export class Migration20261012090000_create_rag_schema extends Migration {
    override async up(): Promise<void> {
        this.addSql(`create schema if not exists "rag";`);
        this.addSql(
            `create extension if not exists vector with schema public;`
        );

        this.addSql(`
            create table if not exists "rag"."rag_documents" (
                "id" uuid primary key,
                "source_filename" text not null,
                "local_path" text not null,
                "mime_type" text,
                "content_hash" text not null,
                "content_chars" integer not null default 0,
                "chunk_count" integer not null default 0,
                "chunk_size" integer not null,
                "chunk_overlap" integer not null,
                "embedding_model" text not null,
                "embedding_dimension" integer not null,
                "status" text not null default 'PROCESSING',
                "error_message" text,
                "metadata" jsonb not null default '{}'::jsonb,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now()
            );
        `);

        this.addSql(`
            create table if not exists "rag"."rag_document_chunks" (
                "id" uuid primary key,
                "document_id" uuid not null
                    references "rag"."rag_documents"("id") on delete cascade,
                "chunk_index" integer not null,
                "content" text not null,
                "content_chars" integer not null,
                "embedding" public.vector(768) not null,
                "metadata" jsonb not null default '{}'::jsonb,
                "created_at" timestamptz not null default now(),
                unique ("document_id", "chunk_index")
            );
        `);

        // HNSW needs pgvector 0.5+; older servers get ivfflat, as apps/ai did.
        this.addSql(`
            do $$
            begin
                create index if not exists "rag_document_chunks_embedding_hnsw_idx"
                    on "rag"."rag_document_chunks"
                    using hnsw ("embedding" public.vector_cosine_ops);
            exception when others then
                create index if not exists "rag_document_chunks_embedding_ivfflat_idx"
                    on "rag"."rag_document_chunks"
                    using ivfflat ("embedding" public.vector_cosine_ops);
            end
            $$;
        `);

        this.addSql(`
            create index if not exists "rag_documents_knowledge_item_idx"
                on "rag"."rag_documents" (("metadata"->>'knowledge_item_id'));
        `);
        this.addSql(`
            create index if not exists "rag_documents_chatbot_ids_gin_idx"
                on "rag"."rag_documents" using gin ("metadata" jsonb_path_ops);
        `);
    }

    override async down(): Promise<void> {
        // The tables hold customers' knowledge; a rollback keeps them.
    }
}
