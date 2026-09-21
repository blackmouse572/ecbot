import { Migration } from '@mikro-orm/migrations';

export class Migration20260702132942 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "conversation_reads" drop constraint if exists "conversation_reads_conversation_id_fkey";`
        );

        this.addSql(
            `alter table "conversation_reads" add column if not exists "created_by_id" uuid null, add column if not exists "updated_by_id" uuid null, add column if not exists "deleted_by_id" uuid null;`
        );
        this.addSql(
            `alter table "conversation_reads" alter column "last_read_at" drop default;`
        );
        this.addSql(
            `alter table "conversation_reads" alter column "last_read_at" type timestamptz using ("last_read_at"::timestamptz);`
        );
        this.addSql(
            `DO $$ BEGIN alter table "conversation_reads" add constraint "conversation_reads_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
        );
        this.addSql(
            `DO $$ BEGIN alter table "conversation_reads" add constraint "conversation_reads_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
        );
        this.addSql(
            `DO $$ BEGIN alter table "conversation_reads" add constraint "conversation_reads_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
        );
        this.addSql(
            `DO $$ BEGIN alter table "conversation_reads" add constraint "conversation_reads_conversation_id_foreign" foreign key ("conversation_id") references "conversations" ("id") on update cascade on delete cascade; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
        );
        this.addSql(
            `create index if not exists "conversation_reads_deleted_at_index" on "conversation_reads" ("deleted_at");`
        );
        this.addSql(
            `create index if not exists "conversation_reads_updated_at_index" on "conversation_reads" ("updated_at");`
        );
        this.addSql(
            `create index if not exists "conversation_reads_created_at_index" on "conversation_reads" ("created_at");`
        );
        this.addSql(
            `create index if not exists "conversation_reads_deleted_index" on "conversation_reads" ("deleted");`
        );
        this.addSql(
            `alter index if exists "conversation_reads_conversation_id_idx" rename to "conversation_reads_conversation_id_index";`
        );
        this.addSql(
            `alter index if exists "conversation_reads_operator_id_idx" rename to "conversation_reads_operator_id_index";`
        );
        this.addSql(
            `drop index if exists "conversation_reads_operator_conversation_unique";`
        );
        this.addSql(
            `alter table "conversation_reads" add constraint "conversation_reads_operator_id_conversation_id_unique" unique ("operator_id", "conversation_id");`
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
            `alter table "conversation_reads" drop constraint "conversation_reads_created_by_id_foreign";`
        );
        this.addSql(
            `alter table "conversation_reads" drop constraint "conversation_reads_updated_by_id_foreign";`
        );
        this.addSql(
            `alter table "conversation_reads" drop constraint "conversation_reads_deleted_by_id_foreign";`
        );
        this.addSql(
            `alter table "conversation_reads" drop constraint "conversation_reads_conversation_id_foreign";`
        );

        this.addSql(`drop index "conversation_reads_deleted_at_index";`);
        this.addSql(`drop index "conversation_reads_updated_at_index";`);
        this.addSql(`drop index "conversation_reads_created_at_index";`);
        this.addSql(`drop index "conversation_reads_deleted_index";`);
        this.addSql(
            `alter table "conversation_reads" drop column "created_by_id", drop column "updated_by_id", drop column "deleted_by_id";`
        );

        this.addSql(
            `alter table "conversation_reads" alter column "last_read_at" type timestamptz(6) using ("last_read_at"::timestamptz(6));`
        );
        this.addSql(
            `alter table "conversation_reads" alter column "last_read_at" set default CURRENT_TIMESTAMP;`
        );
        this.addSql(
            `alter table "conversation_reads" add constraint "conversation_reads_conversation_id_fkey" foreign key ("conversation_id") references "conversations" ("id") on update no action on delete cascade;`
        );
        this.addSql(
            `alter index "conversation_reads_conversation_id_index" rename to "conversation_reads_conversation_id_idx";`
        );
        this.addSql(
            `alter table "conversation_reads" drop constraint "conversation_reads_operator_id_conversation_id_unique";`
        );
        this.addSql(
            `alter table "conversation_reads" add constraint "conversation_reads_operator_conversation_unique" unique ("operator_id", "conversation_id");`
        );
        this.addSql(
            `alter index "conversation_reads_operator_id_index" rename to "conversation_reads_operator_id_idx";`
        );

        this.addSql(
            `alter table "workspace_members" alter column "joined_at" type timestamptz(6) using ("joined_at"::timestamptz(6));`
        );
        this.addSql(
            `alter table "workspace_members" alter column "joined_at" set default CURRENT_TIMESTAMP;`
        );
    }
}
