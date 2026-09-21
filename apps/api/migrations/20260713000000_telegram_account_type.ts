import { Migration } from '@mikro-orm/migrations';

export class Migration20260713000000_telegram_account_type extends Migration {
    override async up(): Promise<void> {
        // Expand accounts.type check to include TELEGRAM_BOT
        this.addSql(
            `alter table "accounts" drop constraint if exists "accounts_type_check";`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_type_check" check("type" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP', 'TELEGRAM_BOT'));`
        );

        // Expand contact_points.platform check to include TELEGRAM_BOT
        this.addSql(
            `alter table "contact_points" drop constraint if exists "contact_points_platform_check";`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_platform_check" check("platform" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP', 'TELEGRAM_BOT'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "contact_points" drop constraint if exists "contact_points_platform_check";`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_platform_check" check("platform" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP'));`
        );

        this.addSql(
            `alter table "accounts" drop constraint if exists "accounts_type_check";`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_type_check" check("type" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP'));`
        );
    }
}
