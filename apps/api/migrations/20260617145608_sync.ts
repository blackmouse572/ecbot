import { Migration } from '@mikro-orm/migrations';

export class Migration20260617145608_sync extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `DO $$ BEGIN IF EXISTS (select 1 from information_schema.tables where table_name = 'rag_document_chunks') THEN alter table "rag_document_chunks" drop constraint if exists "rag_document_chunks_document_id_fkey"; END IF; END $$;`
        );

        this.addSql(
            `alter table "tool_install_sessions" drop constraint "tool_install_sessions_created_by_id_fkey";`
        );
        this.addSql(
            `alter table "tool_install_sessions" drop constraint "tool_install_sessions_deleted_by_id_fkey";`
        );
        this.addSql(
            `alter table "tool_install_sessions" drop constraint "tool_install_sessions_updated_by_id_fkey";`
        );
        this.addSql(
            `alter table "tool_install_sessions" drop constraint "tool_install_sessions_workspace_id_fkey";`
        );

        this.addSql(
            `alter table "knowledge_item_chunks" drop constraint "knowledge_item_chunks_knowledge_base_item_id_foreign";`
        );

        this.addSql(
            `alter table "customer_tags" drop constraint "customer_tags_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "customers" drop constraint "customers_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "customer_tag_assignments" drop constraint "customer_tag_assignments_customer_id_foreign";`
        );
        this.addSql(
            `alter table "customer_tag_assignments" drop constraint "customer_tag_assignments_tag_id_foreign";`
        );

        this.addSql(
            `alter table "customer_merge_suggestions" drop constraint "customer_merge_suggestions_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_customer_id_foreign";`
        );
        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );

        this.addSql(
            `alter table "tool_install_sessions" alter column "provider" type text using ("provider"::text);`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_provider_check" check("provider" in ('COMPOSIO', 'ECCHO', 'OPERATOR'));`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `create index "tool_install_sessions_deleted_at_index" on "tool_install_sessions" ("deleted_at");`
        );
        this.addSql(
            `create index "tool_install_sessions_updated_at_index" on "tool_install_sessions" ("updated_at");`
        );
        this.addSql(
            `alter index "tool_install_sessions_created_at_idx" rename to "tool_install_sessions_created_at_index";`
        );
        this.addSql(
            `alter index "tool_install_sessions_deleted_idx" rename to "tool_install_sessions_deleted_index";`
        );
        this.addSql(
            `alter index "tool_install_sessions_expires_at_idx" rename to "tool_install_sessions_expires_at_index";`
        );
        this.addSql(
            `alter index "tool_install_sessions_workspace_id_idx" rename to "tool_install_sessions_workspace_id_index";`
        );

        this.addSql(
            `alter table "tools" drop constraint "tools_slug_per_workspace_unique";`
        );
        this.addSql(
            `alter table "tools" add constraint "tools_workspace_id_slug_unique" unique ("workspace_id", "slug");`
        );

        this.addSql(`drop index "knowledge_item_chunks_embedding_index";`);
        this.addSql(
            `drop index "knowledge_item_chunks_knowledge_base_item_id_index";`
        );

        this.addSql(
            `alter table "knowledge_item_chunks" add constraint "knowledge_item_chunks_knowledge_base_item_id_foreign" foreign key ("knowledge_base_item_id") references "knowledge_base_items" ("id") on update cascade;`
        );

        this.addSql(`drop index "customer_tags_workspace_name_unique";`);

        this.addSql(
            `alter table "customer_tags" add constraint "customer_tags_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tags" add constraint "customer_tags_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tags" add constraint "customer_tags_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tags" add constraint "customer_tags_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `create index "customer_tags_deleted_at_index" on "customer_tags" ("deleted_at");`
        );
        this.addSql(
            `create index "customer_tags_updated_at_index" on "customer_tags" ("updated_at");`
        );
        this.addSql(
            `create index "customer_tags_created_at_index" on "customer_tags" ("created_at");`
        );
        this.addSql(
            `create index "customer_tags_deleted_index" on "customer_tags" ("deleted");`
        );
        this.addSql(
            `alter table "customer_tags" add constraint "customer_tags_workspace_id_name_unique" unique ("workspace_id", "name");`
        );

        this.addSql(
            `alter table "customers" add constraint "customers_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customers" add constraint "customers_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customers" add constraint "customers_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customers" add constraint "customers_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `create index "customers_deleted_at_index" on "customers" ("deleted_at");`
        );
        this.addSql(
            `create index "customers_updated_at_index" on "customers" ("updated_at");`
        );
        this.addSql(
            `create index "customers_created_at_index" on "customers" ("created_at");`
        );
        this.addSql(
            `create index "customers_deleted_index" on "customers" ("deleted");`
        );

        this.addSql(
            `drop index "customer_tag_assignments_customer_tag_unique";`
        );

        this.addSql(
            `alter table "customer_tag_assignments" add constraint "customer_tag_assignments_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tag_assignments" add constraint "customer_tag_assignments_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tag_assignments" add constraint "customer_tag_assignments_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tag_assignments" add constraint "customer_tag_assignments_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "customer_tag_assignments" add constraint "customer_tag_assignments_tag_id_foreign" foreign key ("tag_id") references "customer_tags" ("id") on update cascade;`
        );
        this.addSql(
            `create index "customer_tag_assignments_deleted_at_index" on "customer_tag_assignments" ("deleted_at");`
        );
        this.addSql(
            `create index "customer_tag_assignments_updated_at_index" on "customer_tag_assignments" ("updated_at");`
        );
        this.addSql(
            `create index "customer_tag_assignments_created_at_index" on "customer_tag_assignments" ("created_at");`
        );
        this.addSql(
            `create index "customer_tag_assignments_deleted_index" on "customer_tag_assignments" ("deleted");`
        );
        this.addSql(
            `alter table "customer_tag_assignments" add constraint "customer_tag_assignments_customer_id_tag_id_unique" unique ("customer_id", "tag_id");`
        );

        this.addSql(
            `alter table "customer_merge_suggestions" add constraint "customer_merge_suggestions_status_check" check("status" in ('PENDING', 'DISMISSED', 'MERGED'));`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" add constraint "customer_merge_suggestions_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" add constraint "customer_merge_suggestions_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" add constraint "customer_merge_suggestions_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" add constraint "customer_merge_suggestions_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `create index "customer_merge_suggestions_deleted_at_index" on "customer_merge_suggestions" ("deleted_at");`
        );
        this.addSql(
            `create index "customer_merge_suggestions_updated_at_index" on "customer_merge_suggestions" ("updated_at");`
        );
        this.addSql(
            `create index "customer_merge_suggestions_created_at_index" on "customer_merge_suggestions" ("created_at");`
        );
        this.addSql(
            `create index "customer_merge_suggestions_deleted_index" on "customer_merge_suggestions" ("deleted");`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" drop constraint "customer_merge_suggestions_workspace_pair_field_unique";`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" add constraint "customer_merge_suggestions_workspace_id_customer__6a18c_unique" unique ("workspace_id", "customer_a_id", "customer_b_id", "match_field");`
        );

        this.addSql(
            `alter table "contact_points" alter column "platform" type text using ("platform"::text);`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_platform_check" check("platform" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP'));`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `create index "contact_points_deleted_at_index" on "contact_points" ("deleted_at");`
        );
        this.addSql(
            `create index "contact_points_updated_at_index" on "contact_points" ("updated_at");`
        );
        this.addSql(
            `create index "contact_points_created_at_index" on "contact_points" ("created_at");`
        );
        this.addSql(
            `create index "contact_points_deleted_index" on "contact_points" ("deleted");`
        );
        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_workspace_platform_sender_unique";`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_workspace_id_platform_external_sender_id_unique" unique ("workspace_id", "platform", "external_sender_id");`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL', 'CUSTOMER', 'CONTACT_POINT'));`
        );

        this.addSql(`alter table "accounts" drop column if exists "webhook_secret";`);

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
            `alter table "rag_document_chunks" add constraint "rag_document_chunks_document_id_fkey" foreign key ("document_id") references "rag_documents" ("id") on update no action on delete cascade;`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );

        this.addSql(
            `alter table "contact_points" drop constraint if exists "contact_points_platform_check";`
        );

        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_deleted_by_id_foreign";`
        );
        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_workspace_id_foreign";`
        );
        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_customer_id_foreign";`
        );

        this.addSql(
            `alter table "customer_merge_suggestions" drop constraint if exists "customer_merge_suggestions_status_check";`
        );

        this.addSql(
            `alter table "customer_merge_suggestions" drop constraint "customer_merge_suggestions_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" drop constraint "customer_merge_suggestions_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" drop constraint "customer_merge_suggestions_deleted_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" drop constraint "customer_merge_suggestions_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "customer_tag_assignments" drop constraint "customer_tag_assignments_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_tag_assignments" drop constraint "customer_tag_assignments_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_tag_assignments" drop constraint "customer_tag_assignments_deleted_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_tag_assignments" drop constraint "customer_tag_assignments_customer_id_foreign";`
        );
        this.addSql(
            `alter table "customer_tag_assignments" drop constraint "customer_tag_assignments_tag_id_foreign";`
        );

        this.addSql(
            `alter table "customer_tags" drop constraint "customer_tags_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_tags" drop constraint "customer_tags_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_tags" drop constraint "customer_tags_deleted_by_id_foreign";`
        );
        this.addSql(
            `alter table "customer_tags" drop constraint "customer_tags_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "customers" drop constraint "customers_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "customers" drop constraint "customers_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "customers" drop constraint "customers_deleted_by_id_foreign";`
        );
        this.addSql(
            `alter table "customers" drop constraint "customers_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "knowledge_item_chunks" drop constraint "knowledge_item_chunks_knowledge_base_item_id_foreign";`
        );

        this.addSql(
            `alter table "tool_install_sessions" drop constraint if exists "tool_install_sessions_provider_check";`
        );

        this.addSql(
            `alter table "tool_install_sessions" drop constraint "tool_install_sessions_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "tool_install_sessions" drop constraint "tool_install_sessions_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "tool_install_sessions" drop constraint "tool_install_sessions_deleted_by_id_foreign";`
        );
        this.addSql(
            `alter table "tool_install_sessions" drop constraint "tool_install_sessions_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "accounts" add column "webhook_secret" text null;`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL'));`
        );

        this.addSql(`drop index "contact_points_deleted_at_index";`);
        this.addSql(`drop index "contact_points_updated_at_index";`);
        this.addSql(`drop index "contact_points_created_at_index";`);
        this.addSql(`drop index "contact_points_deleted_index";`);

        this.addSql(
            `alter table "contact_points" alter column "platform" type varchar(50) using ("platform"::varchar(50));`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "contact_points" drop constraint "contact_points_workspace_id_platform_external_sender_id_unique";`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_workspace_platform_sender_unique" unique ("workspace_id", "platform", "external_sender_id");`
        );

        this.addSql(
            `drop index "customer_merge_suggestions_deleted_at_index";`
        );
        this.addSql(
            `drop index "customer_merge_suggestions_updated_at_index";`
        );
        this.addSql(
            `drop index "customer_merge_suggestions_created_at_index";`
        );
        this.addSql(`drop index "customer_merge_suggestions_deleted_index";`);

        this.addSql(
            `alter table "customer_merge_suggestions" alter column "status" type text using ("status"::text);`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" add constraint "customer_merge_suggestions_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" drop constraint "customer_merge_suggestions_workspace_id_customer__6a18c_unique";`
        );
        this.addSql(
            `alter table "customer_merge_suggestions" add constraint "customer_merge_suggestions_workspace_pair_field_unique" unique ("workspace_id", "customer_a_id", "customer_b_id", "match_field");`
        );

        this.addSql(`drop index "customer_tag_assignments_deleted_at_index";`);
        this.addSql(`drop index "customer_tag_assignments_updated_at_index";`);
        this.addSql(`drop index "customer_tag_assignments_created_at_index";`);
        this.addSql(`drop index "customer_tag_assignments_deleted_index";`);
        this.addSql(
            `alter table "customer_tag_assignments" drop constraint "customer_tag_assignments_customer_id_tag_id_unique";`
        );

        this.addSql(
            `alter table "customer_tag_assignments" add constraint "customer_tag_assignments_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "customer_tag_assignments" add constraint "customer_tag_assignments_tag_id_foreign" foreign key ("tag_id") references "customer_tags" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `CREATE UNIQUE INDEX customer_tag_assignments_customer_tag_unique ON public.customer_tag_assignments USING btree (customer_id, tag_id) WHERE (deleted_at IS NULL);`
        );

        this.addSql(`drop index "customer_tags_deleted_at_index";`);
        this.addSql(`drop index "customer_tags_updated_at_index";`);
        this.addSql(`drop index "customer_tags_created_at_index";`);
        this.addSql(`drop index "customer_tags_deleted_index";`);
        this.addSql(
            `alter table "customer_tags" drop constraint "customer_tags_workspace_id_name_unique";`
        );

        this.addSql(
            `alter table "customer_tags" add constraint "customer_tags_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `CREATE UNIQUE INDEX customer_tags_workspace_name_unique ON public.customer_tags USING btree (workspace_id, name) WHERE (deleted_at IS NULL);`
        );

        this.addSql(`drop index "customers_deleted_at_index";`);
        this.addSql(`drop index "customers_updated_at_index";`);
        this.addSql(`drop index "customers_created_at_index";`);
        this.addSql(`drop index "customers_deleted_index";`);

        this.addSql(
            `alter table "customers" add constraint "customers_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "knowledge_item_chunks" add constraint "knowledge_item_chunks_knowledge_base_item_id_foreign" foreign key ("knowledge_base_item_id") references "knowledge_base_items" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `create index "knowledge_item_chunks_embedding_index" on "knowledge_item_chunks" ("embedding");`
        );
        this.addSql(
            `create index "knowledge_item_chunks_knowledge_base_item_id_index" on "knowledge_item_chunks" ("knowledge_base_item_id");`
        );

        this.addSql(`drop index "tool_install_sessions_deleted_at_index";`);
        this.addSql(`drop index "tool_install_sessions_updated_at_index";`);

        this.addSql(
            `alter table "tool_install_sessions" alter column "provider" type varchar(50) using ("provider"::varchar(50));`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_created_by_id_fkey" foreign key ("created_by_id") references "users" ("id") on update no action on delete set null;`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_deleted_by_id_fkey" foreign key ("deleted_by_id") references "users" ("id") on update no action on delete set null;`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_updated_by_id_fkey" foreign key ("updated_by_id") references "users" ("id") on update no action on delete set null;`
        );
        this.addSql(
            `alter table "tool_install_sessions" add constraint "tool_install_sessions_workspace_id_fkey" foreign key ("workspace_id") references "workspaces" ("id") on update no action on delete cascade;`
        );
        this.addSql(
            `alter index "tool_install_sessions_created_at_index" rename to "tool_install_sessions_created_at_idx";`
        );
        this.addSql(
            `alter index "tool_install_sessions_deleted_index" rename to "tool_install_sessions_deleted_idx";`
        );
        this.addSql(
            `alter index "tool_install_sessions_expires_at_index" rename to "tool_install_sessions_expires_at_idx";`
        );
        this.addSql(
            `alter index "tool_install_sessions_workspace_id_index" rename to "tool_install_sessions_workspace_id_idx";`
        );

        this.addSql(
            `alter table "tools" drop constraint "tools_workspace_id_slug_unique";`
        );
        this.addSql(
            `alter table "tools" add constraint "tools_slug_per_workspace_unique" unique ("workspace_id", "slug");`
        );

        this.addSql(
            `alter table "workspace_members" alter column "joined_at" type timestamptz(6) using ("joined_at"::timestamptz(6));`
        );
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" set default '2026-06-03 18:07:33.220195+00';`
        );
    }
}
