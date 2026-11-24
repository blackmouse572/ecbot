import { Migration } from '@mikro-orm/migrations';

// A Zalo OA follow or unfollow is logged on the customer's timeline.

export class Migration20261124093000_marketing_event_follow extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "marketing_events" drop constraint if exists "marketing_events_kind_check";`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_kind_check" check("kind" in ('STAGE', 'PERMISSION', 'CONSENT_ASKED', 'HOSTILE', 'REACTION', 'INTENT', 'SOURCE', 'FOLLOW'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`delete from "marketing_events" where "kind" = 'FOLLOW';`);
        this.addSql(
            `alter table "marketing_events" drop constraint if exists "marketing_events_kind_check";`
        );
        this.addSql(
            `alter table "marketing_events" add constraint "marketing_events_kind_check" check("kind" in ('STAGE', 'PERMISSION', 'CONSENT_ASKED', 'HOSTILE', 'REACTION', 'INTENT', 'SOURCE'));`
        );
    }
}
