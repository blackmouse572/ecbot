import { Migration } from '@mikro-orm/migrations';

const LEGACY_TYPES = `'FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP', 'TELEGRAM_BOT'`;
const NEW_TYPES = `${LEGACY_TYPES}, 'API_CHANNEL', 'WEBSITE_WIDGET'`;

export class Migration20260904000000_add_account_config_and_channel_types extends Migration {
    override async up(): Promise<void> {
        // Per-account channel settings for the two eccho-issued channels:
        // {callbackUrl, signingSecret} for API_CHANNEL,
        // {allowedOrigins, theme} for WEBSITE_WIDGET.
        this.addSql(`alter table "accounts" add column "config" jsonb null;`);

        this.addSql(
            `alter table "accounts" drop constraint if exists "accounts_type_check";`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_type_check" check("type" in (${NEW_TYPES}));`
        );

        this.addSql(
            `alter table "contact_points" drop constraint if exists "contact_points_platform_check";`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_platform_check" check("platform" in (${NEW_TYPES}));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "contact_points" drop constraint if exists "contact_points_platform_check";`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_platform_check" check("platform" in (${LEGACY_TYPES}));`
        );

        this.addSql(
            `alter table "accounts" drop constraint if exists "accounts_type_check";`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_type_check" check("type" in (${LEGACY_TYPES}));`
        );

        this.addSql(`alter table "accounts" drop column "config";`);
    }
}
