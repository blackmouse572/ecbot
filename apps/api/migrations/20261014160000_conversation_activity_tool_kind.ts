import { Migration } from '@mikro-orm/migrations';

// Built-in tool calls (customer fields, tags, handoffs, follow-ups, images)
// become a third activity kind, so the inbox trace shows them.
const KINDS_BEFORE = `'SKILL', 'KNOWLEDGE'`;
const KINDS_AFTER = `${KINDS_BEFORE}, 'TOOL'`;

export class Migration20261014160000_conversation_activity_tool_kind extends Migration {
    override async up(): Promise<void> {
        // Fail fast rather than queue behind long transactions on a busy table.
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "conversation_activities" drop constraint if exists "conversation_activities_kind_check";`
        );
        // Every existing row satisfies the narrower check; NOT VALID skips a
        // full-table scan under the ACCESS EXCLUSIVE lock.
        this.addSql(
            `alter table "conversation_activities" add constraint "conversation_activities_kind_check" check("kind" in (${KINDS_AFTER})) not valid;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "conversation_activities" drop constraint if exists "conversation_activities_kind_check";`
        );
        // TOOL rows stay; NOT VALID restores the old check for new rows only.
        this.addSql(
            `alter table "conversation_activities" add constraint "conversation_activities_kind_check" check("kind" in (${KINDS_BEFORE})) not valid;`
        );
    }
}
