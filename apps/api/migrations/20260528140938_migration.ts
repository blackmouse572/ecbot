import { Migration } from '@mikro-orm/migrations';

export class Migration20260528140938 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `DO $$ BEGIN IF EXISTS (select 1 from information_schema.tables where table_name = 'chat_session_messages') THEN alter table "chat_session_messages" drop constraint if exists "chat_session_messages_chat_session_id_foreign"; END IF; END $$;`
        );

        this.addSql(
            `alter table "roles" drop constraint "roles_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "roles" alter column "workspace_id" drop default;`
        );
        this.addSql(
            `alter table "roles" alter column "workspace_id" type uuid using ("workspace_id"::text::uuid);`
        );
        this.addSql(
            `alter table "roles" add constraint "roles_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "conversations" alter column "status" type text using ("status"::text);`
        );
        this.addSql(
            `alter table "conversations" alter column "status" set default 'OPEN';`
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
            `alter table "chat_session_messages" add constraint "chat_session_messages_chat_session_id_foreign" foreign key ("chat_session_id") references "chat_sessions" ("id") on update cascade on delete no action;`
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
            `alter table "roles" drop constraint "roles_workspace_id_foreign";`
        );

        this.addSql(
            `alter table "conversations" alter column "status" type text using ("status"::text);`
        );
        this.addSql(
            `alter table "conversations" alter column "status" set default 'AUTO';`
        );

        this.addSql(
            `alter table "roles" alter column "workspace_id" drop default;`
        );
        this.addSql(
            `alter table "roles" alter column "workspace_id" type uuid using ("workspace_id"::text::uuid);`
        );
        this.addSql(
            `alter table "roles" alter column "workspace_id" drop not null;`
        );
        this.addSql(
            `alter table "roles" add constraint "roles_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "workspace_members" alter column "joined_at" type timestamptz(6) using ("joined_at"::timestamptz(6));`
        );
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" set default '2026-05-17 08:06:40.396453+00';`
        );
    }
}
