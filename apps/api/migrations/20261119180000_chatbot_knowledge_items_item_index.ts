import { Migration } from '@mikro-orm/migrations';

export class Migration20261119180000_chatbot_knowledge_items_item_index extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create index "chatbot_knowledge_items_knowledge_item_id_index" on "chatbot_knowledge_items" ("knowledge_item_id");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `drop index "chatbot_knowledge_items_knowledge_item_id_index";`
        );
    }
}
