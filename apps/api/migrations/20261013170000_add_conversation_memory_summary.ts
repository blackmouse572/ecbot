import { Migration } from '@mikro-orm/migrations';

export class Migration20261013170000_add_conversation_memory_summary extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            'alter table "conversations" add column if not exists "memory_summary" text null, add column if not exists "memory_summary_until_id" uuid null;'
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            'alter table "conversations" drop column if exists "memory_summary", drop column if exists "memory_summary_until_id";'
        );
    }
}
