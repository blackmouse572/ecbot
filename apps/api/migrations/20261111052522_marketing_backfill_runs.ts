import { Migration } from '@mikro-orm/migrations';

export class Migration20261111052522_marketing_backfill_runs extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "marketing_backfill_runs" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "status" text check ("status" in ('NOT_STARTED', 'RUNNING', 'DONE', 'STOPPED_BUDGET')) not null, "since" timestamptz not null, "total" int not null default 0, "processed" int not null default 0, "cursor_at" timestamptz null, "cursor_id" uuid null, "budget_start" bigint null, "budget_floor" bigint null, "processed_at_start" int not null default 0, "finished_at" timestamptz null, constraint "marketing_backfill_runs_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "marketing_backfill_runs_deleted_at_index" on "marketing_backfill_runs" ("deleted_at");`
        );
        this.addSql(
            `create index "marketing_backfill_runs_updated_at_index" on "marketing_backfill_runs" ("updated_at");`
        );
        this.addSql(
            `create index "marketing_backfill_runs_created_at_index" on "marketing_backfill_runs" ("created_at");`
        );
        this.addSql(
            `create index "marketing_backfill_runs_deleted_index" on "marketing_backfill_runs" ("deleted");`
        );
        this.addSql(
            `alter table "marketing_backfill_runs" add constraint "marketing_backfill_runs_workspace_id_unique" unique ("workspace_id");`
        );

        this.addSql(
            `alter table "marketing_backfill_runs" add constraint "marketing_backfill_runs_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_backfill_runs" add constraint "marketing_backfill_runs_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_backfill_runs" add constraint "marketing_backfill_runs_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_backfill_runs" add constraint "marketing_backfill_runs_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "marketing_backfill_runs" cascade;`);
    }
}
