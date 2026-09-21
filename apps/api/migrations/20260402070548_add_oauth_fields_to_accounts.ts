import { Migration } from '@mikro-orm/migrations';

export class Migration20260402070548_add_oauth_fields_to_accounts extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "accounts" drop constraint if exists "accounts_type_check";`
        );

        this.addSql(
            `alter table "accounts" add column "refresh_token" text null, add column "token_expires_at" timestamptz null;`
        );
        this.addSql(
            `alter table "accounts" add constraint "accounts_type_check" check("type" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE', 'TIKTOK_SHOP', 'SHOPEE_SHOP'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "accounts" drop constraint if exists "accounts_type_check";`
        );

        this.addSql(
            `alter table "accounts" drop column "refresh_token", drop column "token_expires_at";`
        );

        this.addSql(
            `alter table "accounts" add constraint "accounts_type_check" check("type" in ('FACEBOOK_ACCOUNT', 'INSTAGRAM_ACCOUNT', 'FACEBOOK_PAGE', 'INSTAGRAM_PAGE', 'ZALO_ACCOUNT', 'ZALO_PAGE'));`
        );
    }
}
