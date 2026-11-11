import { Migration } from '@mikro-orm/migrations';

export class Migration20261110130000_customer_marketing_state extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "marketing_events" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "customer_id" uuid not null, "kind" text check ("kind" in ('STAGE', 'PERMISSION', 'CONSENT_ASKED', 'HOSTILE')) not null, "actor" text check ("actor" in ('BOT', 'CLASSIFIER', 'OPERATOR', 'CLIENT', 'RULE')) not null, "old_value" varchar(50) null, "new_value" varchar(50) null, "reason" varchar(500) null, "conversation_id" uuid null, "message_id" uuid null, "order_id" uuid null, "campaign_id" uuid null, "product_group_id" uuid null, constraint "marketing_events_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "marketing_events_deleted_at_index" on "marketing_events" ("deleted_at");`
        );
        this.addSql(
            `create index "marketing_events_updated_at_index" on "marketing_events" ("updated_at");`
        );
        this.addSql(
            `create index "marketing_events_created_at_index" on "marketing_events" ("created_at");`
        );
        this.addSql(
            `create index "marketing_events_deleted_index" on "marketing_events" ("deleted");`
        );
        this.addSql(
            `create index "marketing_events_workspace_id_created_at_index" on "marketing_events" ("workspace_id", "created_at");`
        );
        this.addSql(
            `create index "marketing_events_customer_id_created_at_index" on "marketing_events" ("customer_id", "created_at");`
        );

        this.addSql(
            `create table "customer_marketing_states" ("id" uuid not null default gen_random_uuid(), "deleted" boolean not null default false, "created_at" timestamptz not null default CURRENT_TIMESTAMP, "created_by_id" uuid null, "updated_at" timestamptz null, "updated_by_id" uuid null, "deleted_at" timestamptz null, "deleted_by_id" uuid null, "workspace_id" uuid not null, "customer_id" uuid not null, "stage" text check ("stage" in ('NEW', 'INTERESTED', 'ASKED_PRICE', 'BOUGHT_ONCE', 'BOUGHT_REPEAT')) not null default 'NEW', "permission" text check ("permission" in ('PENDING', 'GRANTED', 'PAUSED', 'STOPPED')) not null default 'PENDING', "permission_until" timestamptz null, "hostile" boolean not null default false, "consent_asked_at" timestamptz null, "last_inbound_at" timestamptz null, constraint "customer_marketing_states_pkey" primary key ("id"));`
        );
        this.addSql(
            `create index "customer_marketing_states_deleted_at_index" on "customer_marketing_states" ("deleted_at");`
        );
        this.addSql(
            `create index "customer_marketing_states_updated_at_index" on "customer_marketing_states" ("updated_at");`
        );
        this.addSql(
            `create index "customer_marketing_states_created_at_index" on "customer_marketing_states" ("created_at");`
        );
        this.addSql(
            `create index "customer_marketing_states_deleted_index" on "customer_marketing_states" ("deleted");`
        );
        this.addSql(
            `create index "customer_marketing_states_workspace_id_permission_index" on "customer_marketing_states" ("workspace_id", "permission");`
        );
        this.addSql(
            `create index "customer_marketing_states_workspace_id_stage_index" on "customer_marketing_states" ("workspace_id", "stage");`
        );
        this.addSql(
            `alter table "customer_marketing_states" add constraint "customer_marketing_states_customer_id_unique" unique ("customer_id");`
        );

        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade;`
        );

        this.addSql(
            `alter table "customer_marketing_states" add constraint "customer_marketing_states_created_by_id_foreign" foreign key ("created_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_marketing_states" add constraint "customer_marketing_states_updated_by_id_foreign" foreign key ("updated_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_marketing_states" add constraint "customer_marketing_states_deleted_by_id_foreign" foreign key ("deleted_by_id") references "users" ("id") on update cascade on delete set null;`
        );
        this.addSql(
            `alter table "customer_marketing_states" add constraint "customer_marketing_states_workspace_id_foreign" foreign key ("workspace_id") references "workspaces" ("id") on update cascade;`
        );
        this.addSql(
            `alter table "customer_marketing_states" add constraint "customer_marketing_states_customer_id_foreign" foreign key ("customer_id") references "customers" ("id") on update cascade on delete cascade;`
        );
    }
}
