import { Migration } from '@mikro-orm/migrations';

// Cài đặt gửi tin and the offer ledger the caps and rest rule count (ecbot #505).
export class Migration20261122170815_marketing_send_rules extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "marketing_settings" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "max_per_30_days" smallint not null default 3, "rest_after" smallint not null default 3, "rest_days" smallint not null default 30, "send_from" varchar(5) not null default '09:00', "send_to" varchar(5) not null default '20:00', "stop_keywords" jsonb null, "stop_reply" text null, constraint "marketing_settings_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "marketing_settings_deleted_at_index" on "marketing_settings" ("deleted_at");`
        );
        this.addSql(
            `create index "marketing_settings_updated_at_index" on "marketing_settings" ("updated_at");`
        );
        this.addSql(
            `create index "marketing_settings_created_at_index" on "marketing_settings" ("created_at");`
        );
        this.addSql(
            `create index "marketing_settings_deleted_index" on "marketing_settings" ("deleted");`
        );
        this.addSql(
            `alter table "marketing_settings" add constraint "marketing_settings_workspace_id_unique" unique ("workspace_id");`
        );

        this.addSql(
            `create table "marketing_messages" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "customer_id" uuid not null, "channel" text check ("channel" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP', 'TELEGRAM_BOT', 'API_CHANNEL', 'WEBSITE_WIDGET', 'WHATSAPP_BUSINESS', 'THREADS_ACCOUNT')) null, "status" text check ("status" in ('QUEUED', 'SENT', 'FAILED', 'SKIPPED')) not null, "skip_reason" text check ("skip_reason" in ('NO_CHANNEL', 'WINDOW_CLOSED')) null, "send_day" date not null, "sent_at" timestamptz null, "replied_at" timestamptz null, constraint "marketing_messages_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "marketing_messages_deleted_at_index" on "marketing_messages" ("deleted_at");`
        );
        this.addSql(
            `create index "marketing_messages_updated_at_index" on "marketing_messages" ("updated_at");`
        );
        this.addSql(
            `create index "marketing_messages_created_at_index" on "marketing_messages" ("created_at");`
        );
        this.addSql(
            `create index "marketing_messages_deleted_index" on "marketing_messages" ("deleted");`
        );
        this.addSql(
            `create index "marketing_messages_customer_id_sent_at_index" on "marketing_messages" ("customer_id", "sent_at");`
        );
        this.addSql(
            `create index "marketing_messages_workspace_id_index" on "marketing_messages" ("workspace_id");`
        );

        this.addSql(
            `alter table "marketing_settings" add constraint "marketing_settings_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_settings" add constraint "marketing_settings_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_settings" add constraint "marketing_settings_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_settings" add constraint "marketing_settings_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "marketing_messages" cascade;`);
        this.addSql(`drop table if exists "marketing_settings" cascade;`);
    }
}
