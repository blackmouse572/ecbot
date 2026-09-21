import { Migration } from '@mikro-orm/migrations';

export class Migration20260615000200_add_customer_tags extends Migration {
    override async up(): Promise<void> {
        // customer_tags
        this.addSql(`
            create table if not exists "customer_tags" (
                "id" uuid not null default gen_random_uuid(),
                "deleted" boolean not null default false,
                "created_at" timestamptz not null default CURRENT_TIMESTAMP,
                "created_by_id" uuid null,
                "updated_at" timestamptz null,
                "updated_by_id" uuid null,
                "deleted_at" timestamptz null,
                "deleted_by_id" uuid null,
                "workspace_id" uuid not null,
                "name" varchar(64) not null,
                "emoji" varchar(16) null,
                "description" text null,
                "triggers_handoff" boolean not null default false,
                constraint "customer_tags_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            create index if not exists "customer_tags_workspace_id_index" on "customer_tags" ("workspace_id");
        `);
        // Partial unique: a soft-deleted tag with the same name must NOT block
        // a new tag of that name (operators reuse names after delete).
        this.addSql(`
            create unique index if not exists "customer_tags_workspace_name_unique"
                on "customer_tags" ("workspace_id", "name")
                where "deleted_at" is null;
        `);
        this.addSql(`
            alter table "customer_tags"
                add constraint "customer_tags_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade;
        `);

        // customer_tag_assignments
        this.addSql(`
            create table if not exists "customer_tag_assignments" (
                "id" uuid not null default gen_random_uuid(),
                "deleted" boolean not null default false,
                "created_at" timestamptz not null default CURRENT_TIMESTAMP,
                "created_by_id" uuid null,
                "updated_at" timestamptz null,
                "updated_by_id" uuid null,
                "deleted_at" timestamptz null,
                "deleted_by_id" uuid null,
                "customer_id" uuid not null,
                "tag_id" uuid not null,
                constraint "customer_tag_assignments_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            create index if not exists "customer_tag_assignments_customer_id_index" on "customer_tag_assignments" ("customer_id");
            create index if not exists "customer_tag_assignments_tag_id_index" on "customer_tag_assignments" ("tag_id");
        `);
        // Partial unique: a soft-deleted assignment must NOT block re-applying
        // the same tag to the same customer.
        this.addSql(`
            create unique index if not exists "customer_tag_assignments_customer_tag_unique"
                on "customer_tag_assignments" ("customer_id", "tag_id")
                where "deleted_at" is null;
        `);
        this.addSql(`
            alter table "customer_tag_assignments"
                add constraint "customer_tag_assignments_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade,
                add constraint "customer_tag_assignments_tag_id_foreign" foreign key ("tag_id") references "customer_tags" ("id") on update cascade on delete cascade;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "customer_tag_assignments";`);
        this.addSql(`drop table if exists "customer_tags";`);
    }
}
