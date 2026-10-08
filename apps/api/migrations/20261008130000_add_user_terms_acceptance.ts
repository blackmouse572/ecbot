import { Migration } from '@mikro-orm/migrations';

// Consent record: when a user accepted the Terms of Service and Privacy
// Policy, and which version. Existing users stay null (no backfill).
export class Migration20261008130000_add_user_terms_acceptance extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "users" add column "terms_accepted_at" timestamptz null, add column "terms_version" varchar(20) null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "users" drop column "terms_accepted_at", drop column "terms_version";`
        );
    }
}
