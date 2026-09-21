import { Migration } from '@mikro-orm/migrations';

export class Migration20260706073741 extends Migration {
    override async up(): Promise<void> {
        // All statements are idempotent — columns may already exist in DB due to schema drift.

        // users.gender → nullable with default
        this.addSql(
            `alter table "users" alter column "gender" type text using ("gender"::text);`
        );
        this.addSql(
            `alter table "users" alter column "gender" set default 'MALE';`
        );
        this.addSql(`alter table "users" alter column "gender" drop not null;`);

        // chatbots guardrail columns — IF NOT EXISTS avoids duplicate-column errors
        this.addSql(
            `alter table "chatbots" add column if not exists "guardrail_enabled" boolean not null default false;`
        );
        this.addSql(
            `alter table "chatbots" add column if not exists "guardrail_model_enabled" boolean not null default false;`
        );
        this.addSql(
            `alter table "chatbots" add column if not exists "guardrail_custom_instruction" text null;`
        );
        this.addSql(
            `alter table "chatbots" add column if not exists "guardrail_escalate_on_block" boolean not null default true;`
        );

        // workspace_members.joined_at type/default — safe to re-run
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" type timestamptz using ("joined_at"::timestamptz);`
        );
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" set default 'now()';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `create table "chat_session_messages" ("id" uuid not null default gen_random_uuid(), "deleted" bool not null default false, "created_at" timestamptz(6) not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz(6) null, "updated_by_id" uuid null, "deleted_at" timestamptz(6) null, "deleted_by_id" uuid null, "chat_session_id" uuid not null, "role" varchar(50) not null, "content" text not null, "metadata" jsonb null, constraint "chat_session_messages_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "chat_session_messages_chat_session_id_index" on "chat_session_messages" ("chat_session_id");`
        );
        this.addSql(
            `create index "chat_session_messages_created_at_index" on "chat_session_messages" ("created_at");`
        );
        this.addSql(
            `create index "chat_session_messages_deleted_at_index" on "chat_session_messages" ("deleted_at");`
        );
        this.addSql(
            `create index "chat_session_messages_deleted_index" on "chat_session_messages" ("deleted");`
        );
        this.addSql(
            `create index "chat_session_messages_role_index" on "chat_session_messages" ("role");`
        );
        this.addSql(
            `create index "chat_session_messages_updated_at_index" on "chat_session_messages" ("updated_at");`
        );

        this.addSql(
            `create table "chat_sessions" ("id" uuid not null default gen_random_uuid(), "deleted" bool not null default false, "created_at" timestamptz(6) not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz(6) null, "updated_by_id" uuid null, "deleted_at" timestamptz(6) null, "deleted_by_id" uuid null, "chatbot_id" uuid not null, "provider_id" varchar(255) not null, "user_id" varchar(255) not null, constraint "chat_sessions_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "chat_sessions_chatbot_id_index" on "chat_sessions" ("chatbot_id");`
        );
        this.addSql(
            `create index "chat_sessions_created_at_index" on "chat_sessions" ("created_at");`
        );
        this.addSql(
            `create index "chat_sessions_deleted_at_index" on "chat_sessions" ("deleted_at");`
        );
        this.addSql(
            `create index "chat_sessions_deleted_index" on "chat_sessions" ("deleted");`
        );
        this.addSql(
            `create index "chat_sessions_provider_id_index" on "chat_sessions" ("provider_id");`
        );
        this.addSql(
            `create index "chat_sessions_updated_at_index" on "chat_sessions" ("updated_at");`
        );
        this.addSql(
            `create index "chat_sessions_user_id_index" on "chat_sessions" ("user_id");`
        );

        this.addSql(
            `create table "chatbots_accounts" ("chatbot_entity_id" uuid not null, "account_entity_id" uuid not null, constraint "chatbots_accounts_pkey" primary key ("chatbot_entity_id", "account_entity_id"));`
        );

        this.addSql(
            `create table "rag_document_chunks" ("id" uuid not null, "document_id" uuid not null, "chunk_index" int4 not null, "content" text not null, "content_chars" int4 not null, "embedding" vector(768) not null, "metadata" jsonb not null default '{}', "created_at" timestamptz(6) not null default now(), constraint "rag_document_chunks_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "rag_document_chunks" add constraint "rag_document_chunks_document_id_chunk_index_key" unique ("document_id", "chunk_index");`
        );
        this.addSql(
            `create index "rag_document_chunks_embedding_hnsw_idx" on "rag_document_chunks" ("embedding");`
        );

        this.addSql(
            `create table "rag_documents" ("id" uuid not null, "source_filename" text not null, "local_path" text not null, "mime_type" text null, "content_hash" text not null, "content_chars" int4 not null default 0, "chunk_count" int4 not null default 0, "chunk_size" int4 not null, "chunk_overlap" int4 not null, "embedding_model" text not null, "embedding_dimension" int4 not null, "status" text not null default 'PROCESSING', "error_message" text null, "metadata" jsonb not null default '{}', "created_at" timestamptz(6) not null default now(), "updated_at" timestamptz(6) not null default now(), constraint "rag_documents_pkey" primary key ("id"));`
        );

        this.addSql(
            `alter table "chat_session_messages" add constraint "chat_session_messages_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chat_session_messages" add constraint "chat_session_messages_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chat_session_messages" add constraint "chat_session_messages_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "chat_sessions" add constraint "chat_sessions_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete no action;`
        );
        this.addSql(
            `alter table "chat_sessions" add constraint "chat_sessions_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chat_sessions" add constraint "chat_sessions_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chat_sessions" add constraint "chat_sessions_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "chatbots_accounts" add constraint "chatbots_accounts_account_entity_id_foreign" foreign key ("account_entity_id") references "accounts" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "chatbots_accounts" add constraint "chatbots_accounts_chatbot_entity_id_foreign" foreign key ("chatbot_entity_id") references "chatbots" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "chatbots" drop column "guardrail_enabled", drop column "guardrail_model_enabled", drop column "guardrail_custom_instruction", drop column "guardrail_escalate_on_block";`
        );

        this.addSql(`alter table "users" alter column "gender" drop default;`);
        this.addSql(
            `alter table "users" alter column "gender" type text using ("gender"::text);`
        );
        // Backfill nulls created while the column was nullable, else set not null fails on rollback.
        this.addSql(
            `update "users" set "gender" = 'MALE' where "gender" is null;`
        );
        this.addSql(`alter table "users" alter column "gender" set not null;`);

        this.addSql(
            `alter table "workspace_members" alter column "joined_at" type timestamptz(6) using ("joined_at"::timestamptz(6));`
        );
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" set default now();`
        );
    }
}
