import { Migration } from '@mikro-orm/migrations';

/**
 * `/verify/:token` now locks a reset-password row after 5 wrong OTPs
 * (ResetPasswordEntity.otpAttempt, ResetPasswordService.incrementOtpAttempt).
 * Existing rows default to 0 attempts used.
 */
export class Migration20260924000000_add_reset_password_otp_attempt extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "reset_passwords" add column if not exists "otp_attempt" int not null default 0;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "reset_passwords" drop column if exists "otp_attempt";`
        );
    }
}
