import { Migration } from '@mikro-orm/migrations';

// What an inbound message answers: a message the customer quoted, or the
// business's story they replied to. Empty for every existing message.
export class Migration20261015140000_add_message_reply_to extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "messages" add column "reply_to" jsonb null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "messages" drop column "reply_to";`);
    }
}
