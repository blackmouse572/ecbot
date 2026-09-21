import { Migration } from '@mikro-orm/migrations';

export class Migration20260818000100_add_public_api_key_type extends Migration {
    override async up(): Promise<void> {
        // PUBLIC keys ship in the apps/web browser bundle and only reach routes
        // marked @ApiKeyPublicProtected().
        this.addSql(
            `alter table "api_keys" drop constraint if exists "api_keys_type_check";`
        );
        this.addSql(
            `alter table "api_keys" add constraint "api_keys_type_check" check("type" in ('SYSTEM', 'DEFAULT', 'PUBLIC'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`delete from "api_keys" where "type" = 'PUBLIC';`);
        this.addSql(
            `alter table "api_keys" drop constraint if exists "api_keys_type_check";`
        );
        this.addSql(
            `alter table "api_keys" add constraint "api_keys_type_check" check("type" in ('SYSTEM', 'DEFAULT'));`
        );
    }
}
