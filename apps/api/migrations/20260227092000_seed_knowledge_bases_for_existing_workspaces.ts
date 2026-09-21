import { Migration } from '@mikro-orm/migrations';
import { v4 as uuid } from 'uuid';

export class Migration20260227092000 extends Migration {
    override async up(): Promise<void> {
        // Insert a default knowledge base for each existing workspace
        // Using generate_subscripts and gen_random_uuid for each workspace
        const now = new Date().toISOString();

        this.addSql(`
            INSERT INTO knowledge_bases (
                id,
                workspace_id,
                name,
                description,
                is_active,
                created_at,
                updated_at,
                deleted
            )
            SELECT
                gen_random_uuid(),
                id,
                name || ' Knowledge Base',
                'Default knowledge base for workspace',
                true,
                '${now}',
                '${now}',
                false
            FROM workspaces
            WHERE deleted = false
            AND id NOT IN (
                SELECT DISTINCT workspace_id FROM knowledge_bases WHERE deleted = false
            )
        `);
    }

    override async down(): Promise<void> {
        // Delete all knowledge bases that have the default description
        // This ensures we only rollback the ones created by this migration
        this.addSql(
            `DELETE FROM knowledge_bases 
             WHERE deleted = false 
             AND description = 'Default knowledge base for workspace'`
        );
    }
}
