import { Migration } from '@mikro-orm/migrations';

// #648: an invitee's decline gets its own invitation status (instead of
// REVOKED) and its own activity action.
export class Migration20261127170000_invitation_declined extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "invitations" drop constraint if exists "invitations_status_check";`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_status_check" check("status" in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'DECLINED'));`
        );
        // The decline is logged as its own activity.
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in ('manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'decline_invitation', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end', 'export', 'erase', 'subscription_change_plan', 'subscription_cancel', 'subscription_resume', 'conversation_handoff', 'conversation_takeover', 'conversation_bot_resumed', 'conversation_resolved', 'conversation_reopened'));`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `delete from "activities" where "action" = 'decline_invitation';`
        );
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in ('manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end', 'export', 'erase', 'subscription_change_plan', 'subscription_cancel', 'subscription_resume', 'conversation_handoff', 'conversation_takeover', 'conversation_bot_resumed', 'conversation_resolved', 'conversation_reopened'));`
        );
        // A decline was stored as REVOKED before this status existed.
        this.addSql(
            `update "invitations" set "status" = 'REVOKED' where "status" = 'DECLINED';`
        );
        this.addSql(
            `alter table "invitations" drop constraint if exists "invitations_status_check";`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_status_check" check("status" in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'));`
        );
    }
}
