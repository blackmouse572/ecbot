import { Migration } from '@mikro-orm/migrations';

export class Migration20260728164741_add_message_reactions extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "messages" add column if not exists "reactions" jsonb null;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "messages" drop column if exists "reactions";`
        );
    }
}
