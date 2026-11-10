import { Migration } from '@mikro-orm/migrations';

export class Migration20261110190000_customer_product_reactions extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "customer_product_reactions" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "customer_id" uuid not null, "product_group_id" uuid not null, "until" timestamptz not null, "reason" varchar(500) null, constraint "customer_product_reactions_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "customer_product_reactions_deleted_at_index" on "customer_product_reactions" ("deleted_at");`
        );
        this.addSql(
            `create index "customer_product_reactions_updated_at_index" on "customer_product_reactions" ("updated_at");`
        );
        this.addSql(
            `create index "customer_product_reactions_created_at_index" on "customer_product_reactions" ("created_at");`
        );
        this.addSql(
            `create index "customer_product_reactions_deleted_index" on "customer_product_reactions" ("deleted");`
        );
        this.addSql(
            `alter table "customer_product_reactions" add constraint "customer_product_reactions_customer_id_product_group_id_unique" unique ("customer_id", "product_group_id");`
        );

        this.addSql(
            `alter table "customer_product_reactions" add constraint "customer_product_reactions_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_product_reactions" add constraint "customer_product_reactions_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_product_reactions" add constraint "customer_product_reactions_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_product_reactions" add constraint "customer_product_reactions_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "customer_product_reactions" add constraint "customer_product_reactions_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "customer_product_reactions" add constraint "customer_product_reactions_product_group_id_foreign" foreign key ("product_group_id") references "product_groups" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "marketing_events" drop constraint if exists "marketing_events_kind_check";`
        );

        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_kind_check" check("kind" in ('STAGE', 'PERMISSION', 'CONSENT_ASKED', 'HOSTILE', 'REACTION', 'INTENT'));`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_order_id_foreign" foreign key ("order_id") references "orders" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_product_group_id_foreign" foreign key ("product_group_id") references "product_groups" ("id") on update cascade on delete set null;`
        );

        this.addSql(
            `alter table "customer_marketing_states" add column "last_order_at" timestamptz null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "marketing_events" drop constraint if exists "marketing_events_kind_check";`
        );

        this.addSql(
            `alter table "marketing_events" drop constraint "marketing_events_order_id_foreign";`
        );
        this.addSql(
            `alter table "marketing_events" drop constraint "marketing_events_product_group_id_foreign";`
        );

        this.addSql(
            `alter table "customer_marketing_states" drop column "last_order_at";`
        );

        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_kind_check" check("kind" in ('STAGE', 'PERMISSION', 'CONSENT_ASKED', 'HOSTILE'));`
        );
    }
}
