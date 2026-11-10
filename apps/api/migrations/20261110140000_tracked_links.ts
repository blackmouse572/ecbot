import { Migration } from '@mikro-orm/migrations';

export class Migration20261110140000_tracked_links extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "tracked_links" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "parent_id" uuid null, "account_id" uuid not null, "kind" text check ("kind" in ('LINK', 'QR', 'KOL', 'POST', 'AD')) not null default 'LINK', "status" text check ("status" in ('ACTIVE', 'STOPPED')) not null default 'ACTIVE', "name" varchar(120) not null, "code" varchar(64) not null, "greeting" text null, "tag_ids" jsonb not null default '[]', "promises_offer" boolean not null default false, "target_url" text null, constraint "tracked_links_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "tracked_links_deleted_at_index" on "tracked_links" ("deleted_at");`
        );
        this.addSql(
            `create index "tracked_links_updated_at_index" on "tracked_links" ("updated_at");`
        );
        this.addSql(
            `create index "tracked_links_created_at_index" on "tracked_links" ("created_at");`
        );
        this.addSql(
            `create index "tracked_links_deleted_index" on "tracked_links" ("deleted");`
        );
        this.addSql(
            `create index "tracked_links_workspace_id_parent_id_index" on "tracked_links" ("workspace_id", "parent_id");`
        );
        this.addSql(
            `alter table "tracked_links" add constraint "tracked_links_workspace_id_code_unique" unique ("workspace_id", "code");`
        );

        this.addSql(
            `alter table "tracked_links" add constraint "tracked_links_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tracked_links" add constraint "tracked_links_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tracked_links" add constraint "tracked_links_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tracked_links" add constraint "tracked_links_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "tracked_links" add constraint "tracked_links_parent_id_foreign" foreign key ("parent_id") references "tracked_links" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "tracked_links" add constraint "tracked_links_account_id_foreign" foreign key ("account_id") references "accounts" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "tracked_links" cascade;`);
    }
}
