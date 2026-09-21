import { Migration } from '@mikro-orm/migrations';

export class Migration20260707100000_session_geo_activity extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "sessions" add column if not exists "country" varchar(2) null;`
        );
        this.addSql(
            `alter table "sessions" add column if not exists "last_active_at" timestamptz null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "sessions" drop column if exists "country";`);
        this.addSql(
            `alter table "sessions" drop column if exists "last_active_at";`
        );
    }
}
