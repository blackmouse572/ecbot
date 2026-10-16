import { Migration } from '@mikro-orm/migrations';

// Each extra knowledge base with the workspace's oldest one, the one to keep.
const MERGE = `
    select kb."id" as "from_id", keep."id" as "to_id"
    from "knowledge_bases" kb
    join lateral (
        select k2."id" from "knowledge_bases" k2
        where k2."workspace_id" = kb."workspace_id"
          and k2."deleted_at" is null
        order by k2."created_at" asc, k2."id" asc
        limit 1
    ) keep on keep."id" <> kb."id"
    where kb."deleted_at" is null
`;

// A workspace has one knowledge base: the app only ever shows the first one
// it lists. A second one made through the API or MCP hid the default one and
// its items from the app. Move every item and folder of the extra knowledge
// bases into the workspace's oldest one, then soft-delete the extras. Item
// ids stay the same, so chatbot links and RAG chunks keep working.
export class Migration20261016140000_merge_extra_knowledge_bases extends Migration {
    override async up(): Promise<void> {
        for (const table of [
            'knowledge_base_items',
            'knowledge_base_folders',
        ]) {
            this.addSql(`
                update "${table}" t
                set "knowledge_base_id" = m."to_id", "updated_at" = now()
                from (${MERGE}) m
                where t."knowledge_base_id" = m."from_id";
            `);
        }
        this.addSql(`
            update "knowledge_bases" kb
            set "deleted" = true, "deleted_at" = now()
            from (${MERGE}) m
            where kb."id" = m."from_id";
        `);
        // Keep it at one: a second live knowledge base now fails to insert.
        this.addSql(`
            create unique index if not exists "knowledge_bases_workspace_id_live_unique"
                on "knowledge_bases" ("workspace_id")
                where "deleted_at" is null;
        `);
    }

    override async down(): Promise<void> {
        // Which items came from which knowledge base is not recorded, so
        // rollback leaves them merged.
        this.addSql(
            `drop index if exists "knowledge_bases_workspace_id_live_unique";`
        );
    }
}
