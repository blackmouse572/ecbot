import { Migration } from '@mikro-orm/migrations';

const ACTIONS_BEFORE = `'manage', 'read', 'create', 'update', 'delete', 'join_workspace', 'leave_workspace', 'invite_member', 'remove_member', 'approve_join_workspace', 'active_chatbot', 'inactive_chatbot', 'archive_chatbot', 'unarchive_chatbot', 'link_account_chatbot', 'unlink_account_chatbot', 'clone_chatbot', 'customer_unmerge', 'customer_merge_confirm', 'customer_merge_dismiss', 'role_active', 'role_inactive', 'api_key_reset', 'chatbot_tool_enable', 'chatbot_tool_disable', 'tool_start_install', 'tool_complete_install', 'chatbot_skill_enable', 'chatbot_skill_disable', 'impersonate_start', 'impersonate_end'`;
const ACTIONS_AFTER = `${ACTIONS_BEFORE}, 'login', 'login_failed', 'view'`;

// [column, referenced table, delete rule before this migration]
const FOREIGN_KEYS: [string, string, string][] = [
    ['workspace_id', 'workspaces', 'set null'],
    ['created_by_id', 'users', 'set null'],
    ['updated_by_id', 'users', 'set null'],
    ['deleted_by_id', 'users', 'set null'],
];

// Makes `activities` an append-only audit log (SOC 2 CC7.2, HIPAA
// 164.312(b)/(c)):
// - records the caller's IP address and user agent;
// - adds the LOGIN, LOGIN_FAILED and VIEW actions;
// - turns every FK from `activities` to ON DELETE NO ACTION. SET NULL is an
//   UPDATE and CASCADE a DELETE of audit rows; users and workspaces are
//   soft-deleted / anonymised, never hard-deleted;
// - a trigger rejects UPDATE, DELETE and TRUNCATE, so the application role
//   cannot rewrite history. DROP TABLE (migration:fresh) still works.
export class Migration20261008110000_audit_log_append_only extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "activities" add column "ip_address" varchar(45) null, add column "user_agent" text null;`
        );

        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_AFTER}));`
        );

        for (const [column, table] of FOREIGN_KEYS) {
            this.addSql(
                `alter table "activities" drop constraint "activities_${column}_foreign";`
            );
            this.addSql(
                `alter table "activities" add constraint "activities_${column}_foreign" foreign key ("${column}") references "${table}" ("id") on update cascade on delete no action;`
            );
        }

        this
            .addSql(`create or replace function "activities_reject_change"() returns trigger language plpgsql as $$
begin
    raise exception 'activities is an append-only audit log: % is not allowed', tg_op
        using errcode = 'insufficient_privilege';
end;
$$;`);
        this.addSql(
            `create trigger "activities_append_only" before update or delete on "activities" for each row execute function "activities_reject_change"();`
        );
        this.addSql(
            `create trigger "activities_no_truncate" before truncate on "activities" for each statement execute function "activities_reject_change"();`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `drop trigger if exists "activities_no_truncate" on "activities";`
        );
        this.addSql(
            `drop trigger if exists "activities_append_only" on "activities";`
        );
        this.addSql(`drop function if exists "activities_reject_change"();`);

        for (const [column, table, deleteRule] of FOREIGN_KEYS) {
            this.addSql(
                `alter table "activities" drop constraint "activities_${column}_foreign";`
            );
            this.addSql(
                `alter table "activities" add constraint "activities_${column}_foreign" foreign key ("${column}") references "${table}" ("id") on update cascade on delete ${deleteRule};`
            );
        }

        // Rows with the new actions would violate the restored CHECK.
        this.addSql(
            `delete from "activities" where "action" in ('login', 'login_failed', 'view');`
        );
        this.addSql(
            `alter table "activities" drop constraint if exists "activities_action_check";`
        );
        this.addSql(
            `alter table "activities" add constraint "activities_action_check" check("action" in (${ACTIONS_BEFORE}));`
        );

        this.addSql(
            `alter table "activities" drop column "ip_address", drop column "user_agent";`
        );
    }
}
