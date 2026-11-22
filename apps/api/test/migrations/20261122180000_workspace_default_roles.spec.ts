import { Migration20261122180000_workspace_default_roles } from '../../migrations/20261122180000_workspace_default_roles';
import { WORKSPACE_DEFAULT_MEMBER_ROLES } from '../../src/modules/workspace/constants/workspace.constant';

type MigrationHarness = {
    addSql: (sql: string) => void;
    up: () => Promise<void>;
    down: () => Promise<void>;
};

const runMigration = async (method: 'up' | 'down') => {
    const sql: string[] = [];
    const migration = Object.create(
        Migration20261122180000_workspace_default_roles.prototype
    ) as MigrationHarness;
    migration.addSql = statement => sql.push(statement);
    await migration[method]();
    return sql;
};

// The role a statement seeds, as the JSON permissions it writes.
const seeded = (sql: string[], name: string) => {
    const statement = sql.find(
        s =>
            !s.includes('jsonb_array_elements') &&
            (s.includes(`set "name" = '${name}'`) ||
                s.includes(`gen_random_uuid(), '${name}'`))
    );
    const json = statement?.match(/'(\[[^']*\])'::jsonb/)?.[1];
    return json ? JSON.parse(json) : undefined;
};

describe('Migration20261122180000_workspace_default_roles', () => {
    it('gives every role the new subjects it held under the old ones', async () => {
        const sql = (await runMigration('up')).join('\n');
        expect(sql).toContain("'subject', 'CONVERSATION'");
        expect(sql).toContain("p->>'subject' = 'CHATBOT'");
        expect(sql).toContain("'subject', 'ORDER'");
        expect(sql).toContain("'subject', 'MARKETING'");
        expect(sql).toContain("p->>'subject' = 'CUSTOMER'");
    });

    it('renames Admin to Manager and Member to Sales', async () => {
        const sql = (await runMigration('up')).join('\n');
        expect(sql).toMatch(/set "name" = 'Manager'[\s\S]*"name" = 'Admin'/);
        expect(sql).toMatch(/set "name" = 'Sales'[\s\S]*"name" = 'Member'/);
    });

    it.each(['Sales', 'Marketing', 'Developer'])(
        'writes the same %s permissions new workspaces get',
        async name => {
            const sql = await runMigration('up');
            const role = WORKSPACE_DEFAULT_MEMBER_ROLES.find(
                r => r.name === name
            )!;
            expect(seeded(sql, name)).toEqual(
                role.permissions.map(p => ({
                    action: p.action,
                    subject: p.subject,
                }))
            );
        }
    );

    it('does not revoke anything on rollback', async () => {
        expect(await runMigration('down')).toEqual([]);
    });
});
