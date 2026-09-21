import { Migration } from '@mikro-orm/migrations';

export class Migration20260815000100_add_skill_permissions_to_workspace_roles extends Migration {
    override async up(): Promise<void> {
        // Grant SKILL (manage) to existing workspace owner + Admin roles.
        this.addSql(`
            UPDATE roles
            SET permissions = permissions || jsonb_build_array(
                jsonb_build_object('subject', 'SKILL', 'action', jsonb_build_array('manage'))
            )
            WHERE workspace_id IS NOT NULL
              AND (type = 'WORKSPACE_OWNER' OR (type = 'WORKSPACE_MEMBER' AND name = 'Admin'))
              AND NOT (permissions @> '[{"subject": "SKILL"}]'::jsonb);
        `);

        // Grant SKILL (read) to existing Member roles.
        this.addSql(`
            UPDATE roles
            SET permissions = permissions || jsonb_build_array(
                jsonb_build_object('subject', 'SKILL', 'action', jsonb_build_array('read'))
            )
            WHERE workspace_id IS NOT NULL
              AND type = 'WORKSPACE_MEMBER' AND name = 'Member'
              AND NOT (permissions @> '[{"subject": "SKILL"}]'::jsonb);
        `);
    }

    override async down(): Promise<void> {
        // Data backfill; rollback must not revoke SKILL grants that may have
        // been configured independently.
    }
}
