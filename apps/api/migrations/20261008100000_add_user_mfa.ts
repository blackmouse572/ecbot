import { Migration } from '@mikro-orm/migrations';

// Metadata-only on Postgres 11+: nullable columns and a constant default, so
// the ACCESS EXCLUSIVE lock on `users` is brief. `lock_timeout` makes the
// deploy fail fast instead of queueing every request behind it.
export class Migration20261008100000_add_user_mfa extends Migration {
    override async up(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "users" add column "mfa_enabled" boolean not null default false, add column "mfa_secret" text null, add column "mfa_pending_secret" text null, add column "mfa_recovery_codes" jsonb null, add column "mfa_last_time_step" int null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "users" drop column "mfa_enabled", drop column "mfa_secret", drop column "mfa_pending_secret", drop column "mfa_recovery_codes", drop column "mfa_last_time_step";`
        );
    }
}
