import { Migration } from '@mikro-orm/migrations';

// One row per browser or installed app that gets a user's notifications as
// Web Push. Rows go with their user.
export class Migration20261019141448_notification_push_subscriptions extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "notification_push_subscriptions" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "user_id" uuid not null, "endpoint" text not null, "p256dh" varchar(255) not null, "auth" varchar(255) not null, "user_agent" varchar(500) null, constraint "notification_push_subscriptions_pkey" primary key ("id"));`
        );
        this.addSql(
            `alter table "notification_push_subscriptions" add constraint "notification_push_subscriptions_endpoint_unique" unique ("endpoint");`
        );
        this.addSql(
            `create index "notification_push_subscriptions_deleted_at_index" on "notification_push_subscriptions" ("deleted_at");`
        );
        this.addSql(
            `create index "notification_push_subscriptions_updated_at_index" on "notification_push_subscriptions" ("updated_at");`
        );
        this.addSql(
            `create index "notification_push_subscriptions_created_at_index" on "notification_push_subscriptions" ("created_at");`
        );
        this.addSql(
            `create index "notification_push_subscriptions_deleted_index" on "notification_push_subscriptions" ("deleted");`
        );
        this.addSql(
            `create index "notification_push_subscriptions_user_id_index" on "notification_push_subscriptions" ("user_id");`
        );

        this.addSql(
            `alter table "notification_push_subscriptions" add constraint "notification_push_subscriptions_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "notification_push_subscriptions" add constraint "notification_push_subscriptions_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "notification_push_subscriptions" add constraint "notification_push_subscriptions_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "notification_push_subscriptions" add constraint "notification_push_subscriptions_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `drop table if exists "notification_push_subscriptions" cascade;`
        );
    }
}
