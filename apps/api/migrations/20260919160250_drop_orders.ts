import { Migration } from '@mikro-orm/migrations';

// Drops the orders table and its data in every environment this runs in. The Order feature was removed.
export class Migration20260919160250_drop_orders extends Migration {
    override async up(): Promise<void> {
        this.addSql(`drop table "orders";`);
    }

    override async down(): Promise<void> {
        this.addSql(
            `create table "orders" ("id" varchar(20) not null, "deleted" bool not null default false, "created_at" timestamptz(6) not null default CURRENT_TIMESTAMP, "updated_at" timestamptz(6) null, "deleted_at" timestamptz(6) null, "chatbot_id" uuid null, "workspace_id" uuid not null, "phone_number" varchar(20) not null, "email" varchar(255) null, "customer_name" varchar(255) null, "details" jsonb not null, "note" text null, "status" text check ("status" in ('OPEN', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'CLOSE')) not null default 'OPEN', "type" text check ("type" in ('PRODUCT', 'SERVICE', 'CONSULTING')) not null default 'CONSULTING', "created_by_id" uuid null, "updated_by_id" uuid null, "deleted_by_id" uuid null, "status_history" jsonb not null default '[]', constraint "orders_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "orders_chatbot_id_index" on "orders" ("chatbot_id");`
        );
        this.addSql(
            `create index "orders_created_at_index" on "orders" ("created_at");`
        );
        this.addSql(
            `create index "orders_customer_name_index" on "orders" ("customer_name");`
        );
        this.addSql(
            `create index "orders_deleted_at_index" on "orders" ("deleted_at");`
        );
        this.addSql(
            `create index "orders_deleted_index" on "orders" ("deleted");`
        );
        this.addSql(`create index "orders_email_index" on "orders" ("email");`);
        this.addSql(
            `create index "orders_phone_number_index" on "orders" ("phone_number");`
        );
        this.addSql(
            `create index "orders_updated_at_index" on "orders" ("updated_at");`
        );
        this.addSql(
            `create index "orders_workspace_id_index" on "orders" ("workspace_id");`
        );

        this.addSql(
            `alter table "orders" add constraint "orders_chatbot_id_foreign" foreign key ("chatbot_id") references "chatbots" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "orders" add constraint "orders_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete no action;`
        );
    }
}
