import { Migration } from '@mikro-orm/migrations';

export class Migration20260811000000 extends Migration {
    async up(): Promise<void> {
        this.addSql(`
            UPDATE roles
            SET permissions = (
                SELECT COALESCE(jsonb_agg(
                    CASE
                        WHEN permission->>'subject' = 'CUSTOMER'
                            AND NOT (permission->'action' ? 'manage')
                        THEN jsonb_set(
                            permission,
                            '{action}',
                            (permission->'action') || '["manage"]'::jsonb
                        )
                        ELSE permission
                    END
                ), '[]'::jsonb)
                FROM jsonb_array_elements(roles.permissions) AS permission
            ) || CASE
                WHEN permissions @> '[{"subject": "CUSTOMER"}]'::jsonb
                THEN '[]'::jsonb
                ELSE jsonb_build_array(
                    jsonb_build_object(
                        'subject', 'CUSTOMER',
                        'action', '["manage"]'::jsonb
                    )
                )
            END
            WHERE type IN ('WORKSPACE_OWNER', 'WORKSPACE_MEMBER')
              AND (
                  type = 'WORKSPACE_OWNER'
                  OR name IN ('Member', 'Admin')
              )
              AND workspace_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements(permissions) AS permission
                  WHERE permission->>'subject' = 'CUSTOMER'
                    AND permission->'action' ? 'manage'
              );
        `);
    }

    async down(): Promise<void> {
        // This data backfill cannot distinguish migration-added grants from
        // permissions that existed before it, so rollback must not revoke
        // CUSTOMER access that may have been configured independently.
    }
}
