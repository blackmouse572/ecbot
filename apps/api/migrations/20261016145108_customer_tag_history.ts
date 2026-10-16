import { Migration } from '@mikro-orm/migrations';

const SYSTEM_KEYS = `'hot_lead', 'new_lead', 'returning_customer', 'vip', 'positive', 'negative', 'complaint', 'angry', 'new_order', 'needs_staff', 'new_booking', 'order_placed'`;

// Default tag names (EN and VI seed catalogs) and the key each one means.
const DEFAULT_TAG_NAMES: Array<[string, string, string]> = [
    ['hot_lead', 'Hot lead', 'Khách tiềm năng cao'],
    ['new_lead', 'New lead', 'Khách mới'],
    ['returning_customer', 'Returning customer', 'Khách quay lại'],
    ['vip', 'VIP', 'VIP'],
    ['positive', 'Positive', 'Hài lòng'],
    ['negative', 'Negative', 'Không hài lòng'],
    ['complaint', 'Complaint', 'Khiếu nại'],
    ['angry', 'Angry', 'Bực tức'],
    ['new_order', 'New order', 'Đơn hàng mới'],
    ['needs_staff', 'Needs staff', 'Cần nhân viên'],
    ['new_booking', 'New booking', 'Lịch hẹn mới'],
    ['order_placed', 'Order placed', 'Đã đặt đơn'],
];

// Tag data the workspace dashboard needs and nothing kept until now:
// - `customer_tags.system_key`: what a default tag means, so "Order placed"
//   still counts after the owner renames it. Existing tags get it from their
//   seeded name (a tag already renamed stays without one).
// - `customer_tag_events`: the history of tags applied and removed (the
//   assignments table only holds what is on a customer now).
export class Migration20261016145108_customer_tag_history extends Migration {
    override async up(): Promise<void> {
        // Fail fast rather than queue behind long transactions on a busy table.
        this.addSql(`set local lock_timeout = '5s';`);

        this.addSql(
            `alter table "customer_tags" add column "system_key" text check ("system_key" in (${SYSTEM_KEYS})) null;`
        );
        this.addSql(
            `create index "customer_tags_workspace_id_system_key_index" on "customer_tags" ("workspace_id", "system_key");`
        );
        for (const [key, en, vi] of DEFAULT_TAG_NAMES) {
            this.addSql(
                `update "customer_tags" set "system_key" = '${key}' where "name" in ('${en}', '${vi}') and "system_key" is null;`
            );
        }

        this.addSql(
            `create table "customer_tag_events" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "customer_id" uuid not null, "tag_id" uuid not null, "action" text check ("action" in ('APPLIED', 'REMOVED')) not null, "actor" text check ("actor" in ('BOT', 'CLASSIFIER', 'OPERATOR', 'CLIENT')) not null, "conversation_id" uuid null, constraint "customer_tag_events_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "customer_tag_events_deleted_at_index" on "customer_tag_events" ("deleted_at");`
        );
        this.addSql(
            `create index "customer_tag_events_updated_at_index" on "customer_tag_events" ("updated_at");`
        );
        this.addSql(
            `create index "customer_tag_events_created_at_index" on "customer_tag_events" ("created_at");`
        );
        this.addSql(
            `create index "customer_tag_events_deleted_index" on "customer_tag_events" ("deleted");`
        );
        this.addSql(
            `create index "customer_tag_events_customer_id_index" on "customer_tag_events" ("customer_id");`
        );
        this.addSql(
            `create index "customer_tag_events_tag_id_index" on "customer_tag_events" ("tag_id");`
        );
        this.addSql(
            `create index "customer_tag_events_workspace_id_created_at_index" on "customer_tag_events" ("workspace_id", "created_at");`
        );
        this.addSql(
            `alter table "customer_tag_events" add constraint "customer_tag_events_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tag_events" add constraint "customer_tag_events_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tag_events" add constraint "customer_tag_events_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_tag_events" add constraint "customer_tag_events_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "customer_tag_events" add constraint "customer_tag_events_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "customer_tag_events" add constraint "customer_tag_events_tag_id_foreign" foreign key ("tag_id") references "customer_tags" ("id") on update cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(`drop table if exists "customer_tag_events" cascade;`);

        this.addSql(
            `drop index if exists "customer_tags_workspace_id_system_key_index";`
        );
        this.addSql(
            `alter table "customer_tags" drop column if exists "system_key";`
        );
    }
}
