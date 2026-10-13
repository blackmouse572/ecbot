import { Migration } from '@mikro-orm/migrations';

// The check constraint's action list before and after this migration, so the
// next subscription action is one line in ACTIONS_AFTER.
const ACTIONS_BEFORE = `'manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end', 'login', 'login_failed', 'view', 'export', 'erase'`;
const ACTIONS_AFTER = `${ACTIONS_BEFORE}, 'subscription_change_plan', 'subscription_cancel', 'subscription_resume'`;

export class Migration20261012151545_subscription_activity_actions extends Migration {
    override async up(): Promise<void> {
        // Fail fast rather than queue behind long transactions on a busy table.
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );

        // Every existing row satisfies the older, narrower check; NOT VALID
        // skips a full-table scan under the ACCESS EXCLUSIVE lock.
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_AFTER})) not valid;`
        );
    }

    override async down(): Promise<void> {
        // Fail fast rather than queue behind long transactions on a busy table.
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );

        // Rows using the new actions stay; NOT VALID restores the old check
        // for new rows without rejecting them.
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_BEFORE})) not valid;`
        );
    }
}
