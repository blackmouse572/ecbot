import { Migration } from '@mikro-orm/migrations';

export class Migration20260615000300_add_customer_merge_suggestions extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table if not exists "customer_merge_suggestions" (
                "id" uuid not null default gen_random_uuid(),
                "deleted" boolean not null default false,
                "created_at" timestamptz not null default CURRENT_TIMESTAMP,
                "created_by_id" uuid null,
                "updated_at" timestamptz null,
                "updated_by_id" uuid null,
                "deleted_at" timestamptz null,
                "deleted_by_id" uuid null,
                "workspace_id" uuid not null,
                "customer_a_id" uuid not null,
                "customer_b_id" uuid not null,
                "match_field" varchar(16) not null,
                "match_value" varchar(255) not null,
                "status" text not null default 'PENDING',
                "resolved_at" timestamptz null,
                "merged_survivor_id" uuid null,
                "merged_loser_id" uuid null,
                "unmerge_snapshot" jsonb null,
                constraint "customer_merge_suggestions_pkey" primary key ("id"),
                constraint "customer_merge_suggestions_workspace_pair_field_unique"
                    unique ("workspace_id", "customer_a_id", "customer_b_id", "match_field")
            );
        `);
        this.addSql(`
            create index if not exists "customer_merge_suggestions_workspace_id_index" on "customer_merge_suggestions" ("workspace_id");
            create index if not exists "customer_merge_suggestions_status_index" on "customer_merge_suggestions" ("status");
            create index if not exists "customer_merge_suggestions_customer_a_id_index" on "customer_merge_suggestions" ("customer_a_id");
            create index if not exists "customer_merge_suggestions_customer_b_id_index" on "customer_merge_suggestions" ("customer_b_id");
        `);
        this.addSql(`
            alter table "customer_merge_suggestions"
                add constraint "customer_merge_suggestions_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade,
                add constraint "customer_merge_suggestions_customer_a_id_foreign" foreign key ("customer_a_id") references "customers" ("id") on update cascade on delete restrict,
                add constraint "customer_merge_suggestions_customer_b_id_foreign" foreign key ("customer_b_id") references "customers" ("id") on update cascade on delete restrict;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "customer_merge_suggestions";`);
    }
}
