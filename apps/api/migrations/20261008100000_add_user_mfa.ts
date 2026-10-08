import { Migration } from '@mikro-orm/migrations';

export class Migration20261008100000_add_user_mfa extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "users" add column "mfa_enabled" boolean not null default false, add column "mfa_secret" text null, add column "mfa_pending_secret" text null, add column "mfa_recovery_codes" jsonb null, add column "mfa_last_time_step" int null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "users" drop column "mfa_enabled", drop column "mfa_secret", drop column "mfa_pending_secret", drop column "mfa_recovery_codes", drop column "mfa_last_time_step";`
        );
    }
}
