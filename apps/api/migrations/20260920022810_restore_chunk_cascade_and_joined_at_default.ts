import { Migration } from '@mikro-orm/migrations';

// joined_at needed no DDL — 20260706074747 already set the real now(); the
// residual was the entity's quoted 'now()' literal, fixed via defaultRaw.
export class Migration20260920022810_restore_chunk_cascade_and_joined_at_default extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "knowledge_item_chunks" drop constraint "knowledge_item_chunks_knowledge_base_item_id_foreign";`
        );

        this.addSql(
            `alter table "knowledge_item_chunks" add constraint "knowledge_item_chunks_knowledge_base_item_id_foreign" foreign key ("knowledge_base_item_id") references "knowledge_base_items" ("id") on update cascade on delete cascade;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "knowledge_item_chunks" drop constraint "knowledge_item_chunks_knowledge_base_item_id_foreign";`
        );

        this.addSql(
            `alter table "knowledge_item_chunks" add constraint "knowledge_item_chunks_knowledge_base_item_id_foreign" foreign key ("knowledge_base_item_id") references "knowledge_base_items" ("id") on update cascade on delete no action;`
        );
    }
}
