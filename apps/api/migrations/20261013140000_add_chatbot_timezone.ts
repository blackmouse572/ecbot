import { Migration } from '@mikro-orm/migrations';

export class Migration20261013140000_add_chatbot_timezone extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            'alter table "chatbots" add column if not exists "timezone" varchar(64) null;'
        );
    }

    override async down(): Promise<void> {
        this.addSql('alter table "chatbots" drop column if exists "timezone";');
    }
}
