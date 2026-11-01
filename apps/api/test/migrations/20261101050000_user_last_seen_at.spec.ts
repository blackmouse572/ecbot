import { Migration20261101050000_user_last_seen_at as Migration } from '../../migrations/20261101050000_user_last_seen_at';

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

describe('Migration20261101050000_user_last_seen_at', () => {
    it("adds the column and backfills it from each user's latest session", async () => {
        const sql = await runMigration('up');

        expect(sql).toContain(
            `alter table "users" add column if not exists "last_seen_at" timestamptz null`
        );
        expect(sql).toContain(
            `max(coalesce(s."last_active_at", s."created_at"))`
        );
        expect(sql).toContain(`create index if not exists`);
    });

    it('drops the column on rollback', async () => {
        expect(await runMigration('down')).toContain(
            `drop column if exists "last_seen_at"`
        );
    });
});
