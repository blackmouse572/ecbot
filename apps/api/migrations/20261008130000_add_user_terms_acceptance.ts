import { Migration } from '@mikro-orm/migrations';

// Consent record: when a user accepted the Terms of Service and Privacy
// Policy, and which version. Existing users stay null (no backfill).
// Metadata-only (nullable columns); `lock_timeout` makes the deploy fail fast
// instead of queueing every request behind the lock on `users`.
export class Migration20261008130000_add_user_terms_acceptance extends Migration {
    override async up(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "users" add column "terms_accepted_at" timestamptz null, add column "terms_version" varchar(20) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "users" drop column "terms_accepted_at", drop column "terms_version";`
        );
    }
}
