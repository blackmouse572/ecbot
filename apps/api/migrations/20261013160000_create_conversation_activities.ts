import { Migration } from '@mikro-orm/migrations';

export class Migration20261013160000_create_conversation_activities extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table if not exists "conversation_activities" ("id" uuid not null default gen_random_uuid(), "conversation_id" uuid not null, "kind" text check ("kind" in ('SKILL', 'KNOWLEDGE')) not null, "label" varchar(120) null, "payload" jsonb null, "created_at" timestamptz not null default CURRENT_TIMESTAMP, constraint "conversation_activities_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index if not exists "conversation_activities_conversation_id_created_at_index" on "conversation_activities" ("conversation_id", "created_at");`
        );
        this.addSql(
            `create index if not exists "conversation_activities_created_at_index" on "conversation_activities" ("created_at");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "conversation_activities" cascade;`);
    }
}
