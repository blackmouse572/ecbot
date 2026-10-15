import { Migration } from '@mikro-orm/migrations';

// The check constraint's action list without the removed actions, so the
// next action is one line in a later migration.
const ACTIONS_AFTER = `'manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end', 'export', 'erase', 'subscription_change_plan', 'subscription_cancel', 'subscription_resume'`;
const REMOVED = `'login', 'login_failed', 'view'`;

// Drops the LOGIN, LOGIN_FAILED and VIEW activities (#328): sessions already
// record sign-ins, and the rows drowned out real changes in the activity log.
//
// `activities` is append-only (20261008110000_audit_log_append_only), so the
// one-off delete switches the row trigger off and back on. It runs as the
// table owner inside the migration transaction: ALTER TABLE holds an ACCESS
// EXCLUSIVE lock until commit, so no other session can write or delete while
// the trigger is off, and a failure rolls the trigger back on with the rest.
export class Migration20261015100000_remove_noise_activity_actions extends Migration {
    override async up(): Promise<void> {
        // Fail fast rather than queue behind long transactions on a busy table.
        this.addSql(`set local lock_timeout = '5s';`);

        this.addSql(
            `alter table "activities" disable trigger "activities_append_only";`
        );
        this.addSql(`delete from "activities" where "action" in (${REMOVED});`);
        this.addSql(
            `alter table "activities" enable trigger "activities_append_only";`
        );

        // The DELETE above already removed every row using the old actions;
        // NOT VALID skips a second full-table scan under the ACCESS EXCLUSIVE
        // lock (docs/migration.md, Locks on Busy Tables). Validate out of band.
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_AFTER})) not valid;`
        );
    }

    override async down(): Promise<void> {
        // The deleted rows are gone for good; down only lets the actions be
        // written again.
        this.addSql(`set local lock_timeout = '5s';`);
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_AFTER}, ${REMOVED})) not valid;`
        );
    }
}
