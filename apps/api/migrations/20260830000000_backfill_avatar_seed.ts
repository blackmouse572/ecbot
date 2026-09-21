import { Migration } from '@mikro-orm/migrations';

// Backfill DiceBear avatars for users/workspaces created before avatar
// generation was added to the create/register flow. Seeded off "id"/"slug"
// (not email) since both are already URL-safe, no encoding needed in SQL.
export class Migration20260830000000_backfill_avatar_seed extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            update "users"
            set "avatar" = 'https://api.dicebear.com/10.x/thumbs/svg?seed=' || "id"::text
                || '&backgroundColor=343437,5e5e62,8c8c90,b6b6b9&shapeColor=c4c4c8,9a9a9e,6e6e72'
            where "avatar" is null or "avatar" = '';
        `);

        this.addSql(`
            update "workspaces"
            set "avatar" = 'https://api.dicebear.com/10.x/loops/svg?seed=' || "slug" || '&scale=1.4'
            where "avatar" is null or "avatar" = '';
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`
            update "users"
            set "avatar" = null
            where "avatar" like 'https://api.dicebear.com/10.x/thumbs/svg?seed=%';
        `);

        this.addSql(`
            update "workspaces"
            set "avatar" = null
            where "avatar" like 'https://api.dicebear.com/10.x/loops/svg?seed=%';
        `);
    }
}
