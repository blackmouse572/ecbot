import { Migration } from '@mikro-orm/migrations';

// Users carry when they were last seen so the admin Users list can show and
// sort by it. Backfilled from each user's latest session activity.
export class Migration20261101050000_user_last_seen_at extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "users" add column if not exists "last_seen_at" timestamptz null;`
        );
        this.addSql(
            `create index if not exists "users_last_seen_at_index" on "users" ("last_seen_at");`
        );
        this.addSql(
            `update "users" u set "last_seen_at" = s."seen" from (select "user_id", max(coalesce(s."last_active_at", s."created_at")) as "seen" from "sessions" s group by "user_id") s where s."user_id" = u."id";`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`drop index if exists "users_last_seen_at_index";`);
        this.addSql(
            `alter table "users" drop column if exists "last_seen_at";`
        );
    }
}
