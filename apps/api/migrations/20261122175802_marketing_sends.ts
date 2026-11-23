import { Migration } from '@mikro-orm/migrations';

// Marketing sends and one offer a customer a day (ecbot #505).

export class Migration20261122175802_marketing_sends extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "marketing_sends" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "audience" jsonb not null, "text" text not null, "image_url" text null, constraint "marketing_sends_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "marketing_sends_deleted_at_index" on "marketing_sends" ("deleted_at");`
        );
        this.addSql(
            `create index "marketing_sends_updated_at_index" on "marketing_sends" ("updated_at");`
        );
        this.addSql(
            `create index "marketing_sends_created_at_index" on "marketing_sends" ("created_at");`
        );
        this.addSql(
            `create index "marketing_sends_deleted_index" on "marketing_sends" ("deleted");`
        );
        this.addSql(
            `create index "marketing_sends_workspace_id_index" on "marketing_sends" ("workspace_id");`
        );

        this.addSql(
            `alter table "marketing_sends" add constraint "marketing_sends_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_sends" add constraint "marketing_sends_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_sends" add constraint "marketing_sends_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_sends" add constraint "marketing_sends_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "marketing_messages" drop constraint if exists "marketing_messages_skip_reason_check";`
        );

        // Nothing wrote offers before sends existed; rows left by tests have no send.
        this.addSql(`delete from "marketing_messages";`);
        this.addSql(
            `alter table "marketing_messages" add column "send_id" uuid not null, add column "conversation_id" uuid null;`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_send_id_foreign" foreign key ("send_id") references "marketing_sends" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_conversation_id_foreign" foreign key ("conversation_id") references "conversations" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_skip_reason_check" check("skip_reason" in ('NO_CHANNEL', 'WINDOW_CLOSED', 'OPTED_OUT'));`
        );
        this.addSql(
            `create unique index "marketing_messages_customer_id_send_day_unique" on "marketing_messages" ("customer_id", "send_day") where "status" in ('QUEUED', 'SENT');`
        );
        this.addSql(
            `create index "marketing_messages_send_id_index" on "marketing_messages" ("send_id");`
        );
    }

    override async down(): Promise<void> {
        // Every offer belongs to a send, and the sends go with this rollback.
        this.addSql(`delete from "marketing_messages";`);
        this.addSql(
            `alter table "marketing_messages" drop constraint "marketing_messages_send_id_foreign";`
        );

        this.addSql(
            `alter table "marketing_messages" drop constraint if exists "marketing_messages_skip_reason_check";`
        );

        this.addSql(
            `alter table "marketing_messages" drop constraint "marketing_messages_conversation_id_foreign";`
        );

        this.addSql(
            `drop index "marketing_messages_customer_id_send_day_unique";`
        );
        this.addSql(`drop index "marketing_messages_send_id_index";`);
        this.addSql(
            `alter table "marketing_messages" drop column "send_id", drop column "conversation_id";`
        );

        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_skip_reason_check" check("skip_reason" in ('NO_CHANNEL', 'WINDOW_CLOSED'));`
        );

        this.addSql(`drop table if exists "marketing_sends" cascade;`);
    }
}
