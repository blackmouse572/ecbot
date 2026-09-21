import { Migration } from '@mikro-orm/migrations';

export class Migration20260513081152 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "accounts" drop constraint "accounts_added_by_id_foreign";`
        );

        this.addSql(
            `alter table "conversations" drop constraint "conversations_account_id_foreign";`
        );
        this.addSql(
            `alter table "conversations" drop constraint "conversations_chatbot_id_foreign";`
        );

        this.addSql(
            `alter table "chatbots" drop column if exists "accounts", drop column if exists "model_image_name";`
        );

        this.addSql(
            `alter table "chatbots" alter column "primary_language" drop default;`
        );
        this.addSql(
            `alter table "chatbots" alter column "primary_language" type text using ("primary_language"::text);`
        );
        this.addSql(
            `alter table "chatbots" alter column "model_temperature" type real using ("model_temperature"::real);`
        );
        this.addSql(
            `alter table "chatbots" alter column "model_temperature" set default 1;`
        );

        this.addSql(`alter table "accounts" drop column "added_by_id";`);

        this.addSql(
            `alter table "conversations" alter column "status" type text using ("status"::text);`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_status_check" check("status" in ('AUTO', 'PAUSED', 'RESOLVED'));`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_account_id_foreign" foreign key ("account_id") references "accounts" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );
        this.addSql(
            `create index "conversations_deleted_at_index" on "conversations" ("deleted_at");`
        );
        this.addSql(
            `create index "conversations_updated_at_index" on "conversations" ("updated_at");`
        );
        this.addSql(
            `create index "conversations_created_at_index" on "conversations" ("created_at");`
        );
        this.addSql(
            `create index "conversations_deleted_index" on "conversations" ("deleted");`
        );
        this.addSql(
            `alter table "conversations" drop constraint "conversations_chatbot_account_sender_unique";`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_chatbot_id_account_id_sender_id_unique" unique ("chatbot_id", "account_id", "sender_id");`
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
            `create table "chatbots_accounts" ("chatbot_entity_id" uuid not null, "account_entity_id" uuid not null, constraint "chatbots_accounts_pkey" primary key ("chatbot_entity_id", "account_entity_id"));`
        );

        this.addSql(
            `alter table "chatbots_accounts" add constraint "chatbots_accounts_account_entity_id_foreign" foreign key ("account_entity_id") references "accounts" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "chatbots_accounts" add constraint "chatbots_accounts_chatbot_entity_id_foreign" foreign key ("chatbot_entity_id") references "chatbots" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "conversations" drop constraint if exists "conversations_status_check";`
        );

        this.addSql(
            `alter table "conversations" drop constraint "conversations_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "conversations" drop constraint "conversations_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "conversations" drop constraint "conversations_deleted_by_id_foreign";`
        );
        this.addSql(
            `alter table "conversations" drop constraint "conversations_chatbot_id_foreign";`
        );
        this.addSql(
            `alter table "conversations" drop constraint "conversations_account_id_foreign";`
        );

        this.addSql(
            `alter table "accounts" add column "added_by_id" uuid null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_added_by_id_foreign" foreign key ("added_by_id") references "users" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "chatbots" add column "accounts" jsonb not null default '[]', add column "model_image_name" varchar not null default 'gemini-3-pro-image-preview';`
        );
        this.addSql(
            `alter table "chatbots" alter column "primary_language" type text using ("primary_language"::text);`
        );
        this.addSql(
            `alter table "chatbots" alter column "primary_language" set default 'en';`
        );
        this.addSql(
            `alter table "chatbots" alter column "model_temperature" type float4 using ("model_temperature"::float4);`
        );
        this.addSql(
            `alter table "chatbots" alter column "model_temperature" set default 1.0;`
        );

        this.addSql(`drop index "conversations_deleted_at_index";`);
        this.addSql(`drop index "conversations_updated_at_index";`);
        this.addSql(`drop index "conversations_created_at_index";`);
        this.addSql(`drop index "conversations_deleted_index";`);

        this.addSql(
            `alter table "conversations" alter column "status" type varchar(20) using ("status"::varchar(20));`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_account_id_foreign" foreign key ("account_id") references "accounts" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "conversations" drop constraint "conversations_chatbot_id_account_id_sender_id_unique";`
        );
        this.addSql(
            `alter table "conversations" add constraint "conversations_chatbot_account_sender_unique" unique ("chatbot_id", "account_id", "sender_id");`
        );

        this.addSql(
            `alter table "workspace_members" alter column "joined_at" type timestamptz(6) using ("joined_at"::timestamptz(6));`
        );
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" set default '2025-10-26 09:21:11.76814+00';`
        );
    }
}
