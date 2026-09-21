import { Migration20260811000000 } from '../../migrations/20260811000000_add_customer_permissions_to_workspace_roles';

type MigrationHarness = {
    addSql: (sql: string) => void;
    up: () => Promise<void>;
    down: () => Promise<void>;
};

const runMigration = async (method: 'up' | 'down') => {
    const sql: string[] = [];
    const migration = Object.create(
        Migration20260811000000.prototype
    ) as MigrationHarness;
    migration.addSql = statement => sql.push(statement);

    await migration[method]();

    return sql.join('\n');
};

describe('Migration20260811000000', () => {
    it('queues an idempotent workspace-role backfill that preserves other permissions', async () => {
        const sql = await runMigration('up');

        expect(sql).toContain('UPDATE roles');
        expect(sql).toContain(
            "type IN ('WORKSPACE_OWNER', 'WORKSPACE_MEMBER')"
        );
        expect(sql).toContain("name IN ('Member', 'Admin')");
        expect(sql).toContain('workspace_id IS NOT NULL');
        expect(sql).toContain('jsonb_array_elements(roles.permissions)');
        expect(sql).toContain('ELSE permission');
        expect(sql).toContain('NOT EXISTS');
        expect(sql).toContain("permission->'action' ? 'manage'");
        expect(sql).toContain("'action', '[\"manage\"]'::jsonb");
    });

    it('does not remove pre-existing CUSTOMER permissions on rollback', async () => {
        expect(await runMigration('down')).toBe('');
    });
});
