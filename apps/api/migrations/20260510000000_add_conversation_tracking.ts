import { Migration } from '@mikro-orm/migrations';

export class Migration20260510000000_add_conversation_tracking extends Migration {
    override async up(): Promise<void> {
        // Add handoff config fields to chatbots table
        this.addSql(
            `alter table "chatbots"
             add column if not exists "handoff_fallback_threshold" int not null default 3,
             add column if not exists "handoff_message" text null,
             add column if not exists "handoff_keywords" text[] null;`
        );

        // Create conversations table
        this.addSql(`
            create table if not exists "conversations" (
                "id" uuid not null default gen_random_uuid(),
                "deleted" boolean not null default false,
                "created_at" timestamptz not null default CURRENT_TIMESTAMP,
                "created_by_id" uuid null,
                "updated_at" timestamptz null,
                "updated_by_id" uuid null,
                "deleted_at" timestamptz null,
                "deleted_by_id" uuid null,
                "chatbot_id" uuid not null,
                "account_id" uuid not null,
                "sender_id" varchar(255) not null,
                "status" varchar(20) not null default 'AUTO',
                "fallback_count" int not null default 0,
                "handoff_at" timestamptz null,
                "resolved_at" timestamptz null,
                "last_message_at" timestamptz null,
                "handoff_reason" text null,
                constraint "conversations_pkey" primary key ("id"),
                constraint "conversations_chatbot_account_sender_unique" unique ("chatbot_id", "account_id", "sender_id")
            );
        `);

        this.addSql(`
            create index if not exists "conversations_chatbot_id_index" on "conversations" ("chatbot_id");
            create index if not exists "conversations_account_id_index" on "conversations" ("account_id");
            create index if not exists "conversations_status_index" on "conversations" ("status");
            create index if not exists "conversations_sender_id_index" on "conversations" ("sender_id");
        `);

        this.addSql(`
            alter table "conversations"
                add constraint "conversations_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete cascade,
                add constraint "conversations_account_id_foreign" foreign key ("account_id") references "accounts" ("id") on update cascade on delete cascade;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "conversations";`);

        this.addSql(
            `alter table "chatbots"
             drop column if exists "handoff_fallback_threshold",
             drop column if exists "handoff_message",
             drop column if exists "handoff_keywords";`
        );
    }
}
