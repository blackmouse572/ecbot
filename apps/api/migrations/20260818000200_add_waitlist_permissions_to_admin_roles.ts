import { Migration } from '@mikro-orm/migrations';

export class Migration20260818000200_add_waitlist_permissions_to_admin_roles extends Migration {
    override async up(): Promise<void> {
        // Grant WAITLIST (manage) to existing platform admin roles.
        this.addSql(`
            UPDATE roles
            SET permissions = permissions || jsonb_build_array(
                jsonb_build_object('subject', 'WAITLIST', 'action', jsonb_build_array('manage'))
            )
            WHERE type = 'ADMIN'
              AND NOT (permissions @> '[{"subject": "WAITLIST"}]'::jsonb);
        `);
    }

    override async down(): Promise<void> {
        // Data backfill; rollback must not revoke grants configured independently.
    }
}
