import { Migration } from '@mikro-orm/migrations';

export class Migration20260907000000_create_followups extends Migration {
    override async up(): Promise<void> {
        // Orphan tables from an abandoned design: they exist in the ORM
        // snapshot and in some databases, but no migration created them and no
        // entity maps them. Drop before creating so the schema matches the
        // FollowupEntity exactly.
        this.addSql(`drop table if exists "followup_logs" cascade;`);
        this.addSql(`drop table if exists "followups" cascade;`);

        this.addSql(
            `create table "followups" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "chatbot_id" uuid not null, "conversation_id" uuid not null, "prompt" text not null, "reason" text not null, "trigger_message_id" uuid null, "status" text check ("status" in ('SCHEDULED', 'COMPLETED', 'SKIPPED', 'FAILED', 'CANCELLED')) not null default 'SCHEDULED', "scheduled_at" timestamptz not null, "fired_at" timestamptz null, "cancelled_at" timestamptz null, "outcome_reason" varchar(255) null, "attempts" int not null default 0, constraint "followups_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "followups_deleted_at_index" on "followups" ("deleted_at");`
        );
        this.addSql(
            `create index "followups_updated_at_index" on "followups" ("updated_at");`
        );
        this.addSql(
            `create index "followups_created_at_index" on "followups" ("created_at");`
        );
        this.addSql(
            `create index "followups_deleted_index" on "followups" ("deleted");`
        );
        this.addSql(
            `create index "followups_chatbot_id_status_index" on "followups" ("chatbot_id", "status");`
        );
        this.addSql(
            `create index "followups_conversation_id_index" on "followups" ("conversation_id");`
        );
        this.addSql(
            `create index "followups_scheduled_at_index" on "followups" ("scheduled_at");`
        );

        this.addSql(
            `alter table "followups" add constraint "followups_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "followups" add constraint "followups_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "followups" add constraint "followups_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "followups" add constraint "followups_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "followups" add constraint "followups_conversation_id_foreign" foreign key ("conversation_id") references "conversations" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "followups" cascade;`);
    }
}
