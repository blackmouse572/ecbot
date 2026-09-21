import { Migration } from '@mikro-orm/migrations';

export class Migration20260227091501 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "usage_events" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "user_id" uuid null, "event_type" text check ("event_type" in ('STORAGE_ADDED', 'STORAGE_REMOVED', 'TOKEN_USED', 'DOCUMENT_PROCESSED')) not null, "amount" int not null, "source" varchar(255) not null, "metadata" jsonb null, constraint "usage_events_pkey" primary key ("id"));`
        );
        this.addSql(
            `comment on column "usage_events"."amount" is 'Amount of usage (bytes for storage, tokens for AI, etc)';`
        );
        this.addSql(
            `comment on column "usage_events"."source" is 'Source of usage: KNOWLEDGE_BASE, CHATBOT, AI_PROCESSING';`
        );
        this.addSql(
            `comment on column "usage_events"."metadata" is 'Additional event details and context';`
        );
        this.addSql(
            `create index "usage_events_deleted_at_index" on "usage_events" ("deleted_at");`
        );
        this.addSql(
            `create index "usage_events_updated_at_index" on "usage_events" ("updated_at");`
        );
        this.addSql(
            `create index "usage_events_created_at_index" on "usage_events" ("created_at");`
        );
        this.addSql(
            `create index "usage_events_deleted_index" on "usage_events" ("deleted");`
        );
        this.addSql(
            `create index "usage_events_workspace_id_created_at_index" on "usage_events" ("workspace_id", "created_at");`
        );
        this.addSql(
            `create index "usage_events_workspace_id_event_type_created_at_index" on "usage_events" ("workspace_id", "event_type", "created_at");`
        );

        this.addSql(
            `create table "knowledge_bases" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "name" varchar(255) not null, "description" text null, "is_active" boolean not null default true, "settings" jsonb null, constraint "knowledge_bases_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "knowledge_bases_deleted_at_index" on "knowledge_bases" ("deleted_at");`
        );
        this.addSql(
            `create index "knowledge_bases_updated_at_index" on "knowledge_bases" ("updated_at");`
        );
        this.addSql(
            `create index "knowledge_bases_created_at_index" on "knowledge_bases" ("created_at");`
        );
        this.addSql(
            `create index "knowledge_bases_deleted_index" on "knowledge_bases" ("deleted");`
        );

        this.addSql(
            `create table "knowledge_base_folders" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "knowledge_base_id" uuid not null, "name" varchar(255) not null, "slug" varchar(255) not null, "parent_folder_id" uuid null, "is_active" boolean not null default true, constraint "knowledge_base_folders_pkey" primary key ("id"));`
        );
        this.addSql(
            `comment on column "knowledge_base_folders"."name" is 'Folder display name';`
        );
        this.addSql(
            `comment on column "knowledge_base_folders"."slug" is 'URL-friendly slug for folder identification';`
        );
        this.addSql(
            `comment on column "knowledge_base_folders"."parent_folder_id" is 'Parent folder for tree structure hierarchy';`
        );
        this.addSql(
            `comment on column "knowledge_base_folders"."is_active" is 'Enable/disable folder visibility';`
        );
        this.addSql(
            `create index "knowledge_base_folders_deleted_at_index" on "knowledge_base_folders" ("deleted_at");`
        );
        this.addSql(
            `create index "knowledge_base_folders_updated_at_index" on "knowledge_base_folders" ("updated_at");`
        );
        this.addSql(
            `create index "knowledge_base_folders_created_at_index" on "knowledge_base_folders" ("created_at");`
        );
        this.addSql(
            `create index "knowledge_base_folders_deleted_index" on "knowledge_base_folders" ("deleted");`
        );
        this.addSql(
            `create index "knowledge_base_folders_knowledge_base_id_parent_folder_id_index" on "knowledge_base_folders" ("knowledge_base_id", "parent_folder_id");`
        );
        this.addSql(
            `create index "knowledge_base_folders_knowledge_base_id_slug_pare_d7ede_index" on "knowledge_base_folders" ("knowledge_base_id", "slug", "parent_folder_id");`
        );

        this.addSql(
            `create table "knowledge_base_items" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "knowledge_base_id" uuid not null, "type" text check ("type" in ('FILE', 'URL', 'TEXT')) not null, "title" varchar(255) not null, "content" text null, "folder_id" uuid null, "metadata" jsonb null, "attachment_bucket" varchar(255) null, "attachment_key" varchar(255) null, "attachment_completed_url" varchar(255) null, "attachment_cdn_url" varchar(255) null, "attachment_mime" varchar(255) null, "attachment_extension" varchar(255) null, "attachment_size" numeric(10,2) null, "status" text check ("status" in ('DRAFT', 'READY', 'PROCESSING', 'COMPLETED', 'FAILED')) not null default 'DRAFT', "error_message" text null, "processed_at" timestamptz null, constraint "knowledge_base_items_pkey" primary key ("id"));`
        );
        this.addSql(
            `comment on column "knowledge_base_items"."title" is 'Title/name of the knowledge item. For FILE: filename, URL: page title, TEXT: content title';`
        );
        this.addSql(
            `comment on column "knowledge_base_items"."content" is 'Content storage. For FILE: extracted text, URL: URL string, TEXT: raw text content';`
        );
        this.addSql(
            `comment on column "knowledge_base_items"."folder_id" is 'Folder organization reference';`
        );
        this.addSql(
            `comment on column "knowledge_base_items"."metadata" is 'Type-specific metadata: FILE={fileName, mimeType}, URL={url, processingMethod, crawlDepth}, TEXT={sourceLink}';`
        );
        this.addSql(
            `comment on column "knowledge_base_items"."error_message" is 'Error details if status is FAILED';`
        );
        this.addSql(
            `comment on column "knowledge_base_items"."processed_at" is 'When AI processing was completed';`
        );
        this.addSql(
            `create index "knowledge_base_items_deleted_at_index" on "knowledge_base_items" ("deleted_at");`
        );
        this.addSql(
            `create index "knowledge_base_items_updated_at_index" on "knowledge_base_items" ("updated_at");`
        );
        this.addSql(
            `create index "knowledge_base_items_created_at_index" on "knowledge_base_items" ("created_at");`
        );
        this.addSql(
            `create index "knowledge_base_items_deleted_index" on "knowledge_base_items" ("deleted");`
        );
        this.addSql(
            `create index "knowledge_base_items_status_index" on "knowledge_base_items" ("status");`
        );
        this.addSql(
            `create index "knowledge_base_items_knowledge_base_id_index" on "knowledge_base_items" ("knowledge_base_id");`
        );
        this.addSql(
            `create index "knowledge_base_items_knowledge_base_id_status_index" on "knowledge_base_items" ("knowledge_base_id", "status");`
        );
        this.addSql(
            `create index "knowledge_base_items_knowledge_base_id_type_index" on "knowledge_base_items" ("knowledge_base_id", "type");`
        );

        this.addSql(
            `create table "knowledge_item_tags" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "knowledge_item_id" uuid not null, "tag" varchar(255) not null, constraint "knowledge_item_tags_pkey" primary key ("id"));`
        );
        this.addSql(
            `comment on column "knowledge_item_tags"."tag" is 'Tag name for flexible item categorization';`
        );
        this.addSql(
            `create index "knowledge_item_tags_deleted_at_index" on "knowledge_item_tags" ("deleted_at");`
        );
        this.addSql(
            `create index "knowledge_item_tags_updated_at_index" on "knowledge_item_tags" ("updated_at");`
        );
        this.addSql(
            `create index "knowledge_item_tags_created_at_index" on "knowledge_item_tags" ("created_at");`
        );
        this.addSql(
            `create index "knowledge_item_tags_deleted_index" on "knowledge_item_tags" ("deleted");`
        );
        this.addSql(
            `create index "knowledge_item_tags_tag_index" on "knowledge_item_tags" ("tag");`
        );
        this.addSql(
            `create index "knowledge_item_tags_knowledge_item_id_tag_index" on "knowledge_item_tags" ("knowledge_item_id", "tag");`
        );

        this.addSql(
            `create table "chatbot_knowledge_items" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "chatbot_id" uuid not null, "knowledge_item_id" uuid not null, "is_active" boolean not null default true, "priority" int not null default 0, constraint "chatbot_knowledge_items_pkey" primary key ("id"));`
        );
        this.addSql(
            `comment on column "chatbot_knowledge_items"."priority" is 'Priority order for document ranking in RAG';`
        );
        this.addSql(
            `create index "chatbot_knowledge_items_deleted_at_index" on "chatbot_knowledge_items" ("deleted_at");`
        );
        this.addSql(
            `create index "chatbot_knowledge_items_updated_at_index" on "chatbot_knowledge_items" ("updated_at");`
        );
        this.addSql(
            `create index "chatbot_knowledge_items_created_at_index" on "chatbot_knowledge_items" ("created_at");`
        );
        this.addSql(
            `create index "chatbot_knowledge_items_deleted_index" on "chatbot_knowledge_items" ("deleted");`
        );

        this.addSql(
            `create table "workspace_usage" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "storage_usage" int not null default 0, "token_usage" int not null default 0, "documents_count" int not null default 0, "metrics" jsonb null, "updated_at" timestamptz null, constraint "workspace_usage_pkey" primary key ("id"));`
        );
        this.addSql(
            `comment on column "workspace_usage"."storage_usage" is 'Storage usage in bytes';`
        );
        this.addSql(
            `comment on column "workspace_usage"."token_usage" is 'Cumulative token usage';`
        );
        this.addSql(
            `comment on column "workspace_usage"."documents_count" is 'Total number of documents';`
        );
        this.addSql(
            `comment on column "workspace_usage"."metrics" is 'Detailed metrics breakdown (storageByType, documentsByStatus, etc)';`
        );
        this.addSql(
            `comment on column "workspace_usage"."updated_at" is 'Last update timestamp';`
        );
        this.addSql(
            `alter table "workspace_usage" add constraint "workspace_usage_workspace_id_unique" unique ("workspace_id");`
        );
        this.addSql(
            `create index "workspace_usage_deleted_at_index" on "workspace_usage" ("deleted_at");`
        );
        this.addSql(
            `create index "workspace_usage_updated_at_index" on "workspace_usage" ("updated_at");`
        );
        this.addSql(
            `create index "workspace_usage_created_at_index" on "workspace_usage" ("created_at");`
        );
        this.addSql(
            `create index "workspace_usage_deleted_index" on "workspace_usage" ("deleted");`
        );
        this.addSql(
            `create index "workspace_usage_workspace_id_index" on "workspace_usage" ("workspace_id");`
        );

        this.addSql(
            `alter table "usage_events" add constraint "usage_events_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "usage_events" add constraint "usage_events_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "usage_events" add constraint "usage_events_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "usage_events" add constraint "usage_events_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "usage_events" add constraint "usage_events_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "knowledge_bases" add constraint "knowledge_bases_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_bases" add constraint "knowledge_bases_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_bases" add constraint "knowledge_bases_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_bases" add constraint "knowledge_bases_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_knowledge_base_id_foreign" foreign key ("knowledge_base_id") references "knowledge_bases" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "knowledge_base_folders" add constraint "knowledge_base_folders_parent_folder_id_foreign" foreign key ("parent_folder_id") references "knowledge_base_folders" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "knowledge_base_items" add constraint "knowledge_base_items_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_base_items" add constraint "knowledge_base_items_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_base_items" add constraint "knowledge_base_items_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_base_items" add constraint "knowledge_base_items_knowledge_base_id_foreign" foreign key ("knowledge_base_id") references "knowledge_bases" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "knowledge_base_items" add constraint "knowledge_base_items_folder_id_foreign" foreign key ("folder_id") references "knowledge_base_folders" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "knowledge_item_tags" add constraint "knowledge_item_tags_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_item_tags" add constraint "knowledge_item_tags_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_item_tags" add constraint "knowledge_item_tags_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "knowledge_item_tags" add constraint "knowledge_item_tags_knowledge_item_id_foreign" foreign key ("knowledge_item_id") references "knowledge_base_items" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "chatbot_knowledge_items" add constraint "chatbot_knowledge_items_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_knowledge_items" add constraint "chatbot_knowledge_items_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_knowledge_items" add constraint "chatbot_knowledge_items_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_knowledge_items" add constraint "chatbot_knowledge_items_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "chatbot_knowledge_items" add constraint "chatbot_knowledge_items_knowledge_item_id_foreign" foreign key ("knowledge_item_id") references "knowledge_base_items" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "workspace_usage" add constraint "workspace_usage_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "workspace_usage" add constraint "workspace_usage_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "workspace_usage" add constraint "workspace_usage_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "workspace_usage" add constraint "workspace_usage_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "knowledge_base_folders" drop constraint "knowledge_base_folders_knowledge_base_id_foreign";`
        );

        this.addSql(
            `alter table "knowledge_base_items" drop constraint "knowledge_base_items_knowledge_base_id_foreign";`
        );

        this.addSql(
            `alter table "knowledge_base_folders" drop constraint "knowledge_base_folders_parent_folder_id_foreign";`
        );

        this.addSql(
            `alter table "knowledge_base_items" drop constraint "knowledge_base_items_folder_id_foreign";`
        );

        this.addSql(
            `alter table "knowledge_item_tags" drop constraint "knowledge_item_tags_knowledge_item_id_foreign";`
        );

        this.addSql(
            `alter table "chatbot_knowledge_items" drop constraint "chatbot_knowledge_items_knowledge_item_id_foreign";`
        );
    }
}
