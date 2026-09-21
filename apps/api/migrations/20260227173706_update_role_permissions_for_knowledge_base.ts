import { Migration } from '@mikro-orm/migrations';

export class Migration20260227173706 extends Migration {
    async up(): Promise<void> {
        // Update WORKSPACE_OWNER role to include KNOWLEDGE_BASE permissions
        this.addSql(`
            UPDATE roles
            SET permissions = permissions || jsonb_build_array(
                jsonb_build_object(
                    'subject', 'KNOWLEDGE_BASE',
                    'action', '["read", "create", "update"]'::jsonb
                )
            )
            WHERE type = 'WORKSPACE_OWNER'
            AND NOT permissions @> '[{"subject": "KNOWLEDGE_BASE"}]'::jsonb;
        `);

        // Update WORKSPACE_MEMBER role to include KNOWLEDGE_BASE read and create permissions
        this.addSql(`
            UPDATE roles
            SET permissions = permissions || jsonb_build_array(
                jsonb_build_object(
                    'subject', 'KNOWLEDGE_BASE',
                    'action', '["read", "create"]'::jsonb
                )
            )
            WHERE type = 'WORKSPACE_MEMBER'
            AND NOT permissions @> '[{"subject": "KNOWLEDGE_BASE"}]'::jsonb;
        `);

        // Update ADMIN role to include KNOWLEDGE_BASE permissions
        this.addSql(`
            UPDATE roles
            SET permissions = permissions || jsonb_build_array(
                jsonb_build_object(
                    'subject', 'KNOWLEDGE_BASE',
                    'action', '["read", "create", "update", "delete"]'::jsonb
                )
            )
            WHERE type = 'ADMIN'
            AND NOT permissions @> '[{"subject": "KNOWLEDGE_BASE"}]'::jsonb;
        `);

        // Update SUPER_ADMIN role to include KNOWLEDGE_BASE permissions
        this.addSql(`
            UPDATE roles
            SET permissions = permissions || jsonb_build_array(
                jsonb_build_object(
                    'subject', 'KNOWLEDGE_BASE',
                    'action', '["read", "create", "update", "delete", "manage"]'::jsonb
                )
            )
            WHERE type = 'SUPER_ADMIN'
            AND NOT permissions @> '[{"subject": "KNOWLEDGE_BASE"}]'::jsonb;
        `);
    }

    async down(): Promise<void> {
        // Remove KNOWLEDGE_BASE permissions from all roles
        this.addSql(`
            UPDATE roles
            SET permissions = (
                SELECT COALESCE(jsonb_agg(perm), '[]'::jsonb)
                FROM jsonb_array_elements(permissions) AS perm
                WHERE perm->>'subject' != 'KNOWLEDGE_BASE'
            )
            WHERE permissions @> '[{"subject": "KNOWLEDGE_BASE"}]'::jsonb;
        `);
    }
}
