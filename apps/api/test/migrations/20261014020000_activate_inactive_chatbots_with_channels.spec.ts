import { Migration20261014020000_activate_inactive_chatbots_with_channels as Migration } from '../../migrations/20261014020000_activate_inactive_chatbots_with_channels';

type MigrationHarness = {
    addSql: (sql: string) => void;
    up: () => Promise<void>;
    down: () => Promise<void>;
};

const runMigration = async (method: 'up' | 'down') => {
    const sql: string[] = [];
    const migration = Object.create(Migration.prototype) as MigrationHarness;
    migration.addSql = statement => sql.push(statement);

    await migration[method]();

    return sql.join('\n');
};

describe('Migration20261014020000_activate_inactive_chatbots_with_channels', () => {
    it('turns on only inactive, live agents that a live channel is linked to', async () => {
        const sql = await runMigration('up');

        expect(sql).toContain(`set "status" = 'active'`);
        expect(sql).toContain(`c."status" = 'inactive'`);
        expect(sql).toContain(`c."deleted_at" is null`);
        expect(sql).toContain(`a."chatbot_id" = c."id"`);
        expect(sql).toContain(`a."deleted_at" is null`);
        // Only agents that have served a conversation, not a draft whose
        // channel was linked moments before the deploy.
        expect(sql).toContain(`conv."chatbot_id" = c."id"`);
    });

    it('leaves statuses alone on rollback', async () => {
        expect(await runMigration('down')).toBe('');
    });
});
