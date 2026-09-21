import { Migration } from '@mikro-orm/migrations';

export class Migration20260811000000_create_client_credentials extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "client_credentials" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "name" varchar(100) not null, "key" varchar(50) not null, "hash" varchar(255) not null, "is_active" boolean not null, "start_date" timestamptz null, "end_date" timestamptz null, constraint "client_credentials_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "client_credentials_deleted_at_index" on "client_credentials" ("deleted_at");`
        );
        this.addSql(
            `create index "client_credentials_updated_at_index" on "client_credentials" ("updated_at");`
        );
        this.addSql(
            `create index "client_credentials_created_at_index" on "client_credentials" ("created_at");`
        );
        this.addSql(
            `create index "client_credentials_deleted_index" on "client_credentials" ("deleted");`
        );
        this.addSql(
            `create index "client_credentials_workspace_id_index" on "client_credentials" ("workspace_id");`
        );
        this.addSql(
            `create index "client_credentials_name_index" on "client_credentials" ("name");`
        );
        this.addSql(
            `create index "client_credentials_is_active_index" on "client_credentials" ("is_active");`
        );
        this.addSql(
            `alter table "client_credentials" add constraint "client_credentials_key_unique" unique ("key");`
        );

        this.addSql(
            `alter table "client_credentials" add constraint "client_credentials_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "client_credentials" add constraint "client_credentials_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "client_credentials" add constraint "client_credentials_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "client_credentials" add constraint "client_credentials_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "client_credentials" cascade;`);
    }
}
