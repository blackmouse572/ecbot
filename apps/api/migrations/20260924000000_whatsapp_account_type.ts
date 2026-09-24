import { Migration } from '@mikro-orm/migrations';

const PREVIOUS_TYPES = `'FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP', 'TELEGRAM_BOT', 'API_CHANNEL', 'WEBSITE_WIDGET'`;
const NEW_TYPES = `${PREVIOUS_TYPES}, 'WHATSAPP_BUSINESS'`;

export class Migration20260924000000_whatsapp_account_type extends Migration {
    override async up(): Promise<void> {
        this.setTypes(NEW_TYPES);
    }

    override async down(): Promise<void> {
        this.setTypes(PREVIOUS_TYPES);
    }

    private setTypes(types: string): void {
        this.addSql(
            `alter table "accounts" drop constraint if exists "accounts_type_check";`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_type_check" check("type" in (${types}));`
        );
        this.addSql(
            `alter table "contact_points" drop constraint if exists "contact_points_platform_check";`
        );
        this.addSql(
            `alter table "contact_points" add constraint "contact_points_platform_check" check("platform" in (${types}));`
        );
    }
}
