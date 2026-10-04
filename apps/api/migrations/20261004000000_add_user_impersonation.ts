import { Migration } from '@mikro-orm/migrations';

export class Migration20261004000000_add_user_impersonation extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "sessions" add column "impersonated_by" uuid null;`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in ('manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end'));`
        );
    }

    override async down(): Promise<void> {
        // Rows with the new actions would violate the restored CHECK.
        this.addSql(
            `delete from "activities" where "action" in ('impersonate_start', 'impersonate_end');`
        );
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in ('manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable'));`
        );

        this.addSql(`alter table "sessions" drop column "impersonated_by";`);
    }
}
