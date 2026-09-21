import { Migration } from '@mikro-orm/migrations';

export class Migration20260424000000 extends Migration {
    override async up(): Promise<void> {
        // Enable pgvector extension (idempotent)
        this.addSql(`create extension if not exists vector;`);

        // Create knowledge_item_chunks table
        this.addSql(`
      create table "knowledge_item_chunks" (
        "id" uuid not null default gen_random_uuid(),
        "created_at" timestamptz not null default CURRENT_TIMESTAMP,
        "knowledge_base_item_id" uuid not null,
        "content" text not null,
        "embedding" vector(768) null,
        "chunk_index" int not null,
        "page_index" int null,
        "url" varchar(2048) null,
        constraint "knowledge_item_chunks_pkey" primary key ("id")
      );
    `);

        this.addSql(
            `comment on column "knowledge_item_chunks"."content" is 'Text content of this chunk';`
        );
        this.addSql(
            `comment on column "knowledge_item_chunks"."embedding" is 'Vector embedding (768-dim, gemini-embedding-001)';`
        );
        this.addSql(
            `comment on column "knowledge_item_chunks"."chunk_index" is 'Zero-based position of this chunk within the parent item';`
        );
        this.addSql(
            `comment on column "knowledge_item_chunks"."page_index" is 'Source page number for FILE/PDF items (null for TEXT/URL)';`
        );
        this.addSql(
            `comment on column "knowledge_item_chunks"."url" is 'Source URL for URL items or individual crawled pages';`
        );

        // Indexes for retrieval
        this.addSql(
            `create index "knowledge_item_chunks_knowledge_base_item_id_index" on "knowledge_item_chunks" ("knowledge_base_item_id");`
        );
        this.addSql(
            `create index "knowledge_item_chunks_knowledge_base_item_id_chunk_index_index" on "knowledge_item_chunks" ("knowledge_base_item_id", "chunk_index");`
        );

        // IVFFlat index for approximate nearest-neighbour vector search (cosine distance)
        // Lists value is a reasonable starting point; tune based on data volume.
        this.addSql(
            `create index "knowledge_item_chunks_embedding_index" on "knowledge_item_chunks" using ivfflat ("embedding" vector_cosine_ops) with (lists = 100);`
        );

        // Foreign key constraint
        this.addSql(`
      alter table "knowledge_item_chunks"
        add constraint "knowledge_item_chunks_knowledge_base_item_id_foreign"
        foreign key ("knowledge_base_item_id")
        references "knowledge_base_items" ("id")
        on update cascade on delete cascade;
    `);
    }

    override async down(): Promise<void> {
        this.addSql(
            `drop index if exists "knowledge_item_chunks_embedding_index";`
        );
        this.addSql(
            `drop index if exists "knowledge_item_chunks_knowledge_base_item_id_chunk_index_index";`
        );
        this.addSql(
            `drop index if exists "knowledge_item_chunks_knowledge_base_item_id_index";`
        );
        this.addSql(`drop table if exists "knowledge_item_chunks";`);
    }
}
