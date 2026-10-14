import { Migration } from '@mikro-orm/migrations';

/** A SYSTEM message is a note the platform leaves in the conversation, such
 *  as the one written when staff hand it back to the bot. */
export class Migration20261014160000_add_message_author_system extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            'alter table "messages" drop constraint if exists "messages_author_type_check";'
        );
        this.addSql(
            `alter table "messages" add constraint "messages_author_type_check" check ("author_type" in ('USER', 'BOT', 'OPERATOR', 'SYSTEM'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`delete from "messages" where "author_type" = 'SYSTEM';`);
        this.addSql(
            'alter table "messages" drop constraint if exists "messages_author_type_check";'
        );
        this.addSql(
            `alter table "messages" add constraint "messages_author_type_check" check ("author_type" in ('USER', 'BOT', 'OPERATOR'));`
        );
    }
}
