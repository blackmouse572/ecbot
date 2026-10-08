import { Migration } from '@mikro-orm/migrations';

const ACTIONS_BEFORE = `'manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end'`;

/** Audit actions for personal data exports and customer erasure. */
export class Migration20261008120000_add_export_erase_activity_actions extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_BEFORE}, 'export', 'erase'));`
        );
    }

    override async down(): Promise<void> {
        // Activity rows are append-only, so rows using the new actions stay;
        // NOT VALID restores the old check for new rows without rejecting them.
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_BEFORE})) not valid;`
        );
    }
}
