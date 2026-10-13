import { Migration } from '@mikro-orm/migrations';

export class Migration20261013180000_add_conversation_timezone extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            'alter table "conversations" add column if not exists "timezone" varchar(64) null;'
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            'alter table "conversations" drop column if exists "timezone";'
        );
    }
}
