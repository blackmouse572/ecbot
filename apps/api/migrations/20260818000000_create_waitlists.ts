import { Migration } from '@mikro-orm/migrations';

export class Migration20260818000000_create_waitlists extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "waitlists" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "email" varchar(320) not null, "source" varchar(100) null, "locale" varchar(10) null, constraint "waitlists_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "waitlists_deleted_at_index" on "waitlists" ("deleted_at");`
        );
        this.addSql(
            `create index "waitlists_updated_at_index" on "waitlists" ("updated_at");`
        );
        this.addSql(
            `create index "waitlists_created_at_index" on "waitlists" ("created_at");`
        );
        this.addSql(
            `create index "waitlists_deleted_index" on "waitlists" ("deleted");`
        );
        this.addSql(
            `create index "waitlists_source_index" on "waitlists" ("source");`
        );
        this.addSql(
            `alter table "waitlists" add constraint "waitlists_email_unique" unique ("email");`
        );

        this.addSql(
            `alter table "waitlists" add constraint "waitlists_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "waitlists" add constraint "waitlists_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "waitlists" add constraint "waitlists_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "waitlists" cascade;`);
    }
}
