import { Migration } from '@mikro-orm/migrations';

export class Migration20260227091945 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `drop index "knowledge_item_tags_knowledge_item_id_tag_index";`
        );

        this.addSql(
            `alter table "knowledge_item_tags" add constraint "knowledge_item_tags_knowledge_item_id_tag_unique" unique ("knowledge_item_id", "tag");`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "knowledge_item_tags" drop constraint "knowledge_item_tags_knowledge_item_id_tag_unique";`
        );

        this.addSql(
            `create index "knowledge_item_tags_knowledge_item_id_tag_index" on "knowledge_item_tags" ("knowledge_item_id", "tag");`
        );
    }
}
