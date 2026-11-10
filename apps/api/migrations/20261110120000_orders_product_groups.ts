import { Migration } from '@mikro-orm/migrations';

// Orders and product groups for lifecycle marketing (ecbot #498): dated,
// confirmed purchases per customer, grouped so the repurchase cycle can be
// learned per product group.
export class Migration20261110120000_orders_product_groups extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "product_groups" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "name" varchar(120) not null, "default_repurchase_days" int null, "learned_repurchase_days" int null, constraint "product_groups_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "product_groups_deleted_at_index" on "product_groups" ("deleted_at");`
        );
        this.addSql(
            `create index "product_groups_updated_at_index" on "product_groups" ("updated_at");`
        );
        this.addSql(
            `create index "product_groups_created_at_index" on "product_groups" ("created_at");`
        );
        this.addSql(
            `create index "product_groups_deleted_index" on "product_groups" ("deleted");`
        );
        this.addSql(
            `alter table "product_groups" add constraint "product_groups_workspace_id_name_unique" unique ("workspace_id", "name");`
        );

        this.addSql(
            `create table "orders" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "customer_id" uuid not null, "code" varchar(64) not null, "total" bigint not null default 0, "currency" varchar(3) not null, "status" text check ("status" in ('PENDING', 'CONFIRMED', 'CANCELLED')) not null, "source" text check ("source" in ('CHAT', 'MANUAL', 'IMPORT')) not null, "ordered_at" timestamptz not null, "confirmed_at" timestamptz null, "note" text null, "conversation_id" uuid null, constraint "orders_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "orders_deleted_at_index" on "orders" ("deleted_at");`
        );
        this.addSql(
            `create index "orders_updated_at_index" on "orders" ("updated_at");`
        );
        this.addSql(
            `create index "orders_created_at_index" on "orders" ("created_at");`
        );
        this.addSql(
            `create index "orders_deleted_index" on "orders" ("deleted");`
        );
        this.addSql(
            `create index "orders_customer_id_ordered_at_index" on "orders" ("customer_id", "ordered_at");`
        );
        this.addSql(
            `create index "orders_workspace_id_ordered_at_index" on "orders" ("workspace_id", "ordered_at");`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_workspace_id_code_unique" unique ("workspace_id", "code");`
        );

        this.addSql(
            `create table "order_items" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "order_id" uuid not null, "name" varchar(255) not null, "product_group_id" uuid null, "quantity" int not null default 1, "unit_price" bigint null, constraint "order_items_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "order_items_deleted_at_index" on "order_items" ("deleted_at");`
        );
        this.addSql(
            `create index "order_items_updated_at_index" on "order_items" ("updated_at");`
        );
        this.addSql(
            `create index "order_items_created_at_index" on "order_items" ("created_at");`
        );
        this.addSql(
            `create index "order_items_deleted_index" on "order_items" ("deleted");`
        );
        this.addSql(
            `create index "order_items_product_group_id_index" on "order_items" ("product_group_id");`
        );
        this.addSql(
            `create index "order_items_order_id_index" on "order_items" ("order_id");`
        );

        this.addSql(
            `alter table "product_groups" add constraint "product_groups_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "product_groups" add constraint "product_groups_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "product_groups" add constraint "product_groups_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "product_groups" add constraint "product_groups_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );

        this.addSql(
            `alter table "orders" add constraint "orders_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "order_items" add constraint "order_items_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "order_items" add constraint "order_items_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "order_items" add constraint "order_items_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "order_items" add constraint "order_items_order_id_foreign" foreign key ("order_id") references "orders" ("id") on update cascade on delete cascade;`
        );
        this.addSql(
            `alter table "order_items" add constraint "order_items_product_group_id_foreign" foreign key ("product_group_id") references "product_groups" ("id") on update cascade on delete set null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "order_items" cascade;`);
        this.addSql(`drop table if exists "orders" cascade;`);
        this.addSql(`drop table if exists "product_groups" cascade;`);
    }
}
