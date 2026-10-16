import { Migration } from '@mikro-orm/migrations';

// The action list from 20261015100000_remove_noise_activity_actions.
const ACTIONS_BEFORE = `'manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end', 'export', 'erase', 'subscription_change_plan', 'subscription_cancel', 'subscription_resume'`;
const ACTIONS_AFTER = `${ACTIONS_BEFORE}, 'conversation_handoff', 'conversation_takeover', 'conversation_bot_resumed', 'conversation_resolved', 'conversation_reopened'`;

// Handoffs the bot raises go into `activities` with no user and no `by`, and
// a member's resolve, reopen, takeover and hand-back get their own action
// instead of a bare "update", so the workspace dashboard can count them
// (`conversations.handoff_at` is cleared again on resolve).
export class Migration20261016160000_conversation_handoff_activity extends Migration {
    override async up(): Promise<void> {
        // Fail fast rather than queue behind long transactions on a busy table.
        this.addSql(`set local lock_timeout = '5s';`);

        // DROP NOT NULL only touches the catalog: no rewrite, no scan.
        this.addSql(
            `alter table "activities" alter column "user_id" drop not null;`
        );
        this.addSql(
            `alter table "activities" alter column "by_id" drop not null;`
        );
        // Every existing row satisfies the wider check; NOT VALID skips a
        // full-table scan under the ACCESS EXCLUSIVE lock.
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_AFTER})) not valid;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(`set local lock_timeout = '5s';`);
        // Bot rows and the new actions stay (the table is append-only), so
        // the columns stay nullable and the old check applies to new rows only.
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_BEFORE})) not valid;`
        );
    }
}
