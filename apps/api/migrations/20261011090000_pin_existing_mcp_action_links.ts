import { Migration } from '@mikro-orm/migrations';

// A chatbot link that never picked its MCP actions (enabled_actions null)
// used to mean every action; it now means every action except destructive
// ones (#177). Links that already existed keep what they had: pin them to
// the actions discovered so far, so only new links get the new default.
export class Migration20261011090000_pin_existing_mcp_action_links extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            update "chatbot_tools" as ct
            set "enabled_actions" = (
                select coalesce(jsonb_agg(action ->> 'name'), '[]'::jsonb)
                from jsonb_array_elements(t."discovered_actions") as action
                where action ->> 'name' is not null
            )
            from "tools" as t
            where ct."tool_id" = t."id"
              and ct."enabled_actions" is null
              and t."kind" = 'MCP'
              and jsonb_typeof(t."discovered_actions") = 'array'
              and jsonb_array_length(t."discovered_actions") > 0;
        `);
    }

    override async down(): Promise<void> {
        // Pinned lists are indistinguishable from lists people picked, so
        // there is nothing safe to undo.
    }
}
