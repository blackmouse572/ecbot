import { Migration } from '@mikro-orm/migrations';

export class Migration20260603180714 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "tools" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "kind" text check ("kind" in ('HTTP', 'MCP')) not null, "name" varchar(120) not null, "description" text not null, "status" text check ("status" in ('ACTIVE', 'PENDING_AUTH', 'EXPIRED', 'REVOKED')) not null default 'ACTIVE', "http_method" text check ("http_method" in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')) null, "http_url" varchar(2048) null, "http_input_schema" jsonb null, "http_headers" jsonb null, "http_auth" jsonb null, "http_credential" text null, "timeout_ms" int not null default 10000, "max_retries" int not null default 1, "mcp_provider" text check ("mcp_provider" in ('COMPOSIO', 'ECCHO', 'OPERATOR')) null, "mcp_server_url" varchar(2048) null, "composio_toolkit" varchar(120) null, "mcp_auth" jsonb null, "mcp_credential" text null, "discovered_actions" jsonb null, "discovery_at" timestamptz null, constraint "tools_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "tools_deleted_at_index" on "tools" ("deleted_at");`
        );
        this.addSql(
            `create index "tools_updated_at_index" on "tools" ("updated_at");`
        );
        this.addSql(
            `create index "tools_created_at_index" on "tools" ("created_at");`
        );
        this.addSql(
            `create index "tools_deleted_index" on "tools" ("deleted");`
        );
        this.addSql(`create index "tools_status_index" on "tools" ("status");`);
        this.addSql(`create index "tools_kind_index" on "tools" ("kind");`);
        this.addSql(
            `create index "tools_workspace_id_index" on "tools" ("workspace_id");`
        );

        this.addSql(
            `create table "tool_invocations" ("id" uuid not null default gen_random_uuid(), "tool_id" uuid not null, "chatbot_id" uuid not null, "conversation_id" uuid null, "correlation_id" varchar(64) not null, "status" text check ("status" in ('SUCCESS', 'ERROR', 'TIMEOUT')) not null, "action_name" varchar(120) null, "input_args" jsonb not null, "output_result" jsonb null, "error_message" text null, "duration_ms" int not null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, constraint "tool_invocations_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "tool_invocations_created_at_index" on "tool_invocations" ("created_at");`
        );
        this.addSql(
            `create index "tool_invocations_correlation_id_index" on "tool_invocations" ("correlation_id");`
        );
        this.addSql(
            `create index "tool_invocations_conversation_id_index" on "tool_invocations" ("conversation_id");`
        );
        this.addSql(
            `create index "tool_invocations_tool_id_index" on "tool_invocations" ("tool_id");`
        );
        this.addSql(
            `create index "tool_invocations_chatbot_id_index" on "tool_invocations" ("chatbot_id");`
        );

        this.addSql(
            `create table "chatbot_tools" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "chatbot_id" uuid not null, "tool_id" uuid not null, "enabled" boolean not null default true, "enabled_actions" jsonb null, constraint "chatbot_tools_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "chatbot_tools_deleted_at_index" on "chatbot_tools" ("deleted_at");`
        );
        this.addSql(
            `create index "chatbot_tools_updated_at_index" on "chatbot_tools" ("updated_at");`
        );
        this.addSql(
            `create index "chatbot_tools_created_at_index" on "chatbot_tools" ("created_at");`
        );
        this.addSql(
            `create index "chatbot_tools_deleted_index" on "chatbot_tools" ("deleted");`
        );
        this.addSql(
            `create index "chatbot_tools_tool_id_index" on "chatbot_tools" ("tool_id");`
        );
        this.addSql(
            `create index "chatbot_tools_chatbot_id_index" on "chatbot_tools" ("chatbot_id");`
        );
        this.addSql(
            `alter table "chatbot_tools" add constraint "chatbot_tools_chatbot_id_tool_id_unique" unique ("chatbot_id", "tool_id");`
        );

        this.addSql(
            `alter table "tools" add constraint "tools_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tools" add constraint "tools_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tools" add constraint "tools_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tools" add constraint "tools_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "tool_invocations" add constraint "tool_invocations_tool_id_foreign" foreign key ("tool_id") references "tools" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "tool_invocations" add constraint "tool_invocations_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "chatbot_tools" add constraint "chatbot_tools_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_tools" add constraint "chatbot_tools_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_tools" add constraint "chatbot_tools_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "chatbot_tools" add constraint "chatbot_tools_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "chatbot_tools" add constraint "chatbot_tools_tool_id_foreign" foreign key ("tool_id") references "tools" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE', 'TOOL'));`
        );

        this.addSql(
            `alter table "workspace_members" alter column "joined_at" type timestamptz using ("joined_at"::timestamptz);`
        );
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" set default 'now()';`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "tool_invocations" drop constraint "tool_invocations_tool_id_foreign";`
        );

        this.addSql(
            `alter table "chatbot_tools" drop constraint "chatbot_tools_tool_id_foreign";`
        );

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
            `alter table "activities" drop constraint if exists "activities_subject_check";`
        );

        this.addSql(
            `alter table "activities" add constraint "activities_subject_check" check("subject" in ('ACCOUNT', 'AUTH', 'API_KEY', 'COUNTRY', 'ROLE', 'USER', 'SESSION', 'ACTIVITY', 'DASHBOARD', 'UTILITIES', 'WORKSPACE', 'CHATBOT', 'ORDER', 'MEMBER', 'RAG', 'KNOWLEDGE_BASE'));`
        );

        this.addSql(
            `alter table "workspace_members" alter column "joined_at" type timestamptz(6) using ("joined_at"::timestamptz(6));`
        );
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" set default '2026-05-28 14:13:02.867444+00';`
        );
    }
}
