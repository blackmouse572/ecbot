import { Migration } from '@mikro-orm/migrations';

// Channel health: set while an account's sends keep failing, so the app,
// the admin site and the nav badge can show it.
export class Migration20261019150000_account_send_failing extends Migration {
    override async up(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "accounts" add column if not exists "send_failing_since" timestamptz null, add column if not exists "last_send_error" varchar(500) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "accounts" drop column if exists "send_failing_since", drop column if exists "last_send_error";`
        );
    }
}
