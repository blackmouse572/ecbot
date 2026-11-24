import { Migration } from '@mikro-orm/migrations';

// A send stops on a page the platform blocked, and pacing stops at the
// shop's closing hour (ecbot #505 follow-up).

export class Migration20261124080000_marketing_account_blocked extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "marketing_messages" drop constraint if exists "marketing_messages_skip_reason_check";`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_skip_reason_check" check("skip_reason" in ('NO_CHANNEL', 'WINDOW_CLOSED', 'OPTED_OUT', 'ACCOUNT_BLOCKED', 'SEND_HOURS_ENDED'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `update "marketing_messages" set "skip_reason" = 'NO_CHANNEL' where "skip_reason" in ('ACCOUNT_BLOCKED', 'SEND_HOURS_ENDED');`
        );
        this.addSql(
            `alter table "marketing_messages" drop constraint if exists "marketing_messages_skip_reason_check";`
        );
        this.addSql(
            `alter table "marketing_messages" add constraint "marketing_messages_skip_reason_check" check("skip_reason" in ('NO_CHANNEL', 'WINDOW_CLOSED', 'OPTED_OUT'));`
        );
    }
}
