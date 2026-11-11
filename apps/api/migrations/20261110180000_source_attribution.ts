import { Migration } from '@mikro-orm/migrations';

export class Migration20261110180000_source_attribution extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "marketing_events" drop constraint if exists "marketing_events_kind_check";`
        );

        this.addSql(
            `alter table "marketing_events" add column "tracked_link_id" uuid null;`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_kind_check" check("kind" in ('STAGE', 'PERMISSION', 'CONSENT_ASKED', 'HOSTILE', 'SOURCE'));`
        );
        this.addSql(
            `create index "marketing_events_tracked_link_id_index" on "marketing_events" ("tracked_link_id");`
        );

        this.addSql(
            `alter table "customer_marketing_states" add column "first_tracked_link_id" uuid null, add column "first_source_at" timestamptz null;`
        );
        this.addSql(
            `alter table "customer_marketing_states" add constraint "customer_marketing_states_first_tracked_link_id_foreign" foreign key ("first_tracked_link_id") references "tracked_links" ("id") on update cascade on delete set null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "customer_marketing_states" drop constraint "customer_marketing_states_first_tracked_link_id_foreign";`
        );

        this.addSql(
            `alter table "marketing_events" drop constraint if exists "marketing_events_kind_check";`
        );

        this.addSql(
            `alter table "customer_marketing_states" drop column "first_tracked_link_id", drop column "first_source_at";`
        );

        this.addSql(`drop index "marketing_events_tracked_link_id_index";`);
        this.addSql(
            `alter table "marketing_events" drop column "tracked_link_id";`
        );

        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_kind_check" check("kind" in ('STAGE', 'PERMISSION', 'CONSENT_ASKED', 'HOSTILE'));`
        );
    }
}
