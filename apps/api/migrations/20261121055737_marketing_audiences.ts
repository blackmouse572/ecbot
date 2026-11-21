import { Migration } from '@mikro-orm/migrations';

// Saved audiences, and a photo and link per product group (ecbot #504).
export class Migration20261121055737_marketing_audiences extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "marketing_audiences" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "name" varchar(120) not null, "preset" text check ("preset" in ('NEW', 'INTERESTED', 'ASKED_PRICE', 'CROSS_SELL', 'REPURCHASE', 'WIN_BACK')) null, "match" text check ("match" in ('ALL', 'ANY')) null, "conditions" jsonb null, constraint "marketing_audiences_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "marketing_audiences_deleted_at_index" on "marketing_audiences" ("deleted_at");`
        );
        this.addSql(
            `create index "marketing_audiences_updated_at_index" on "marketing_audiences" ("updated_at");`
        );
        this.addSql(
            `create index "marketing_audiences_created_at_index" on "marketing_audiences" ("created_at");`
        );
        this.addSql(
            `create index "marketing_audiences_deleted_index" on "marketing_audiences" ("deleted");`
        );
        this.addSql(
            `create index "marketing_audiences_workspace_id_index" on "marketing_audiences" ("workspace_id");`
        );
        this.addSql(
            `alter table "marketing_audiences" add constraint "marketing_audiences_workspace_id_name_unique" unique ("workspace_id", "name");`
        );

        this.addSql(
            `alter table "marketing_audiences" add constraint "marketing_audiences_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_audiences" add constraint "marketing_audiences_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_audiences" add constraint "marketing_audiences_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_audiences" add constraint "marketing_audiences_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "product_groups" add column "image_bucket" varchar(255) null, add column "image_key" varchar(255) null, add column "image_completed_url" varchar(255) null, add column "image_cdn_url" varchar(255) null, add column "image_mime" varchar(255) null, add column "image_extension" varchar(255) null, add column "image_size" numeric(10,2) null, add column "link" varchar(2048) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "product_groups" drop column "image_bucket", drop column "image_key", drop column "image_completed_url", drop column "image_cdn_url", drop column "image_mime", drop column "image_extension", drop column "image_size", drop column "link";`
        );
        this.addSql(`drop table if exists "marketing_audiences" cascade;`);
    }
}
