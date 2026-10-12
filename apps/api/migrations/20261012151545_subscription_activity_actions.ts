import { Migration } from '@mikro-orm/migrations';

export class Migration20261012151545_subscription_activity_actions extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );

        // Every existing row satisfies the older, narrower check; NOT VALID
        // skips a full-table scan under the ACCESS EXCLUSIVE lock.
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in ('manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end', 'login', 'login_failed', 'view', 'export', 'erase', 'subscription_change_plan', 'subscription_cancel', 'subscription_resume')) not valid;`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );

        // Rows using the new actions stay; NOT VALID restores the old check
        // for new rows without rejecting them.
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in ('manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end', 'login', 'login_failed', 'view', 'export', 'erase')) not valid;`
        );
    }
}
