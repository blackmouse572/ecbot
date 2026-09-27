import { Migration } from '@mikro-orm/migrations';

/**
 * `/verify/email` now locks a verification row after 5 wrong OTPs
 * (VerificationEntity.otpAttempt, VerificationService.incrementOtpAttempt).
 * Existing rows default to 0 attempts used.
 */
export class Migration20260924010000_add_verification_otp_attempt extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "verifications" add column if not exists "otp_attempt" int not null default 0;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "verifications" drop column if exists "otp_attempt";`
        );
    }
}
