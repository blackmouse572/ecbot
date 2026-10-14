import { Migration } from '@mikro-orm/migrations';

// Media knowledge items (product photos, banners, PDF menus) the agent can
// send. apps/ai indexes each one as a single row in `rag.rag_media`, apart
// from the knowledge chunks, so media never takes a place in their retrieval.
// Raw SQL like `rag_documents`: MikroORM has no entity for the `rag` schema.
export class Migration20261014120000_add_knowledge_media extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "knowledge_base_items" drop constraint if exists "knowledge_base_items_type_check";`
        );
        this.addSql(
            `alter table "knowledge_base_items" add constraint "knowledge_base_items_type_check" check ("type" in ('FILE', 'URL', 'TEXT', 'MEDIA'));`
        );

        this.addSql(`
            create table if not exists "rag"."rag_media" (
                "id" uuid primary key,
                "knowledge_item_id" text not null unique,
                "chatbot_ids" text[] not null default '{}',
                "title" text not null,
                "description" text not null default '',
                "url" text not null,
                "mime_type" text not null,
                "embedding" public.vector(768) not null,
                "created_at" timestamptz not null default now(),
                "updated_at" timestamptz not null default now()
            );
        `);

        // HNSW needs pgvector 0.5+; older servers get ivfflat, as for chunks.
        this.addSql(`
            do $$
            begin
                create index if not exists "rag_media_embedding_hnsw_idx"
                    on "rag"."rag_media"
                    using hnsw ("embedding" public.vector_cosine_ops);
            exception when others then
                create index if not exists "rag_media_embedding_ivfflat_idx"
                    on "rag"."rag_media"
                    using ivfflat ("embedding" public.vector_cosine_ops);
            end
            $$;
        `);
        this.addSql(`
            create index if not exists "rag_media_chatbot_ids_gin_idx"
                on "rag"."rag_media" using gin ("chatbot_ids");
        `);
    }

    override async down(): Promise<void> {
        // The media rows hold customers' uploads; a rollback keeps them.
    }
}
