import { Migration } from '@mikro-orm/migrations';

export class Migration20260615000000_add_customer_and_contact_point extends Migration {
    override async up(): Promise<void> {
        // customers
        this.addSql(`
            create table if not exists "customers" (
                "id" uuid not null default gen_random_uuid(),
                "deleted" boolean not null default false,
                "created_at" timestamptz not null default CURRENT_TIMESTAMP,
                "created_by_id" uuid null,
                "updated_at" timestamptz null,
                "updated_by_id" uuid null,
                "deleted_at" timestamptz null,
                "deleted_by_id" uuid null,
                "workspace_id" uuid not null,
                "name" varchar(255) null,
                "phone" varchar(50) null,
                "email" varchar(255) null,
                "language" varchar(10) null,
                "metadata" jsonb null,
                "profile_summary" text null,
                "notes" text null,
                "merged_into_customer_id" uuid null,
                constraint "customers_pkey" primary key ("id")
            );
        `);
        this.addSql(`
            create index if not exists "customers_workspace_id_index" on "customers" ("workspace_id");
            create index if not exists "customers_phone_index" on "customers" ("phone");
            create index if not exists "customers_email_index" on "customers" ("email");
            create index if not exists "customers_merged_into_customer_id_index" on "customers" ("merged_into_customer_id");
        `);
        this.addSql(`
            alter table "customers"
                add constraint "customers_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade;
        `);

        // contact_points
        this.addSql(`
            create table if not exists "contact_points" (
                "id" uuid not null default gen_random_uuid(),
                "deleted" boolean not null default false,
                "created_at" timestamptz not null default CURRENT_TIMESTAMP,
                "created_by_id" uuid null,
                "updated_at" timestamptz null,
                "updated_by_id" uuid null,
                "deleted_at" timestamptz null,
                "deleted_by_id" uuid null,
                "workspace_id" uuid not null,
                "customer_id" uuid not null,
                "platform" varchar(50) not null,
                "external_sender_id" varchar(255) not null,
                "display_sender_name" varchar(255) null,
                "sender_avatar" text null,
                "fetched_at" timestamptz null,
                constraint "contact_points_pkey" primary key ("id"),
                constraint "contact_points_workspace_platform_sender_unique" unique ("workspace_id", "platform", "external_sender_id")
            );
        `);
        this.addSql(`
            create index if not exists "contact_points_workspace_id_index" on "contact_points" ("workspace_id");
            create index if not exists "contact_points_customer_id_index" on "contact_points" ("customer_id");
        `);
        this.addSql(`
            alter table "contact_points"
                add constraint "contact_points_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade on delete cascade,
                add constraint "contact_points_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade;
        `);

        // conversations.contact_point_id (nullable, additive — old sender* columns stay as read-fallback)
        this.addSql(`
            alter table "conversations" add column if not exists "contact_point_id" uuid null;
        `);
        this.addSql(`
            create index if not exists "conversations_contact_point_id_index" on "conversations" ("contact_point_id");
        `);
        this.addSql(`
            alter table "conversations"
                add constraint "conversations_contact_point_id_foreign" foreign key ("contact_point_id") references "contact_points" ("id") on update cascade on delete set null;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "conversations" drop constraint if exists "conversations_contact_point_id_foreign";`
        );
        this.addSql(
            `drop index if exists "conversations_contact_point_id_index";`
        );
        this.addSql(
            `alter table "conversations" drop column if exists "contact_point_id";`
        );
        this.addSql(`drop table if exists "contact_points";`);
        this.addSql(`drop table if exists "customers";`);
    }
}
