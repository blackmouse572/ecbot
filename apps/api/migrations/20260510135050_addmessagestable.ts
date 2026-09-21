import { Migration } from '@mikro-orm/migrations';

export class Migration20260510135050_AddMessagesTable extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "messages" (
                "id" uuid not null default gen_random_uuid(),
                "deleted" boolean not null default false,
                "created_at" timestamptz not null default CURRENT_TIMESTAMP,
                "created_by_id" uuid null,
                "updated_at" timestamptz null,
                "updated_by_id" uuid null,
                "deleted_at" timestamptz null,
                "deleted_by_id" uuid null,
                "conversation_id" uuid not null,
                "direction" text check ("direction" in ('INBOUND', 'OUTBOUND')) not null,
                "author_type" text check ("author_type" in ('USER', 'BOT', 'OPERATOR')) not null,
                "author_id" varchar(255) not null,
                "external_id" varchar(255) null,
                "client_nonce" uuid null,
                "text" text null,
                "attachments" jsonb null,
                "raw" jsonb null,
                "date_sent" timestamptz not null,
                "status" text check ("status" in ('PENDING', 'SENT', 'FAILED')) null,
                constraint "messages_pkey" primary key ("id")
            );
        `);

        this.addSql(
            `create index "messages_deleted_index" on "messages" ("deleted");`
        );
        this.addSql(
            `create index "messages_created_at_index" on "messages" ("created_at");`
        );
        this.addSql(
            `create index "messages_updated_at_index" on "messages" ("updated_at");`
        );
        this.addSql(
            `create index "messages_deleted_at_index" on "messages" ("deleted_at");`
        );
        this.addSql(
            `create index "messages_conversation_id_index" on "messages" ("conversation_id");`
        );
        this.addSql(
            `create index "messages_external_id_index" on "messages" ("external_id");`
        );
        this.addSql(
            `create index "messages_client_nonce_index" on "messages" ("client_nonce");`
        );
        this.addSql(
            `create index "messages_date_sent_index" on "messages" ("date_sent");`
        );
        this.addSql(
            `alter table "messages" add constraint "UQ_messages_conversation_externalId" unique ("conversation_id", "external_id");`
        );

        this.addSql(
            `alter table "messages" add constraint "messages_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "messages" add constraint "messages_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "messages" add constraint "messages_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "messages" add constraint "messages_conversation_id_foreign" foreign key ("conversation_id") references "conversations" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "messages";`);
    }
}
