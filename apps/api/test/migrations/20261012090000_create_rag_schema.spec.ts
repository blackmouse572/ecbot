import { Migration20261012090000_create_rag_schema } from '../../migrations/20261012090000_create_rag_schema';

type MigrationHarness = {
    addSql: (sql: string) => void;
    up: () => Promise<void>;
    down: () => Promise<void>;
};

const runMigration = async (method: 'up' | 'down') => {
    const sql: string[] = [];
    const migration = Object.create(
        Migration20261012090000_create_rag_schema.prototype
    ) as MigrationHarness;
    migration.addSql = statement => sql.push(statement);

    await migration[method]();

    return sql.join('\n');
};

describe('Migration20261012090000_create_rag_schema', () => {
    it('creates the rag schema, the vector extension and both tables', async () => {
        const sql = await runMigration('up');

        expect(sql).toContain('create schema if not exists "rag"');
        expect(sql).toContain('create extension if not exists vector');
        expect(sql).toContain(
            'create table if not exists "rag"."rag_documents"'
        );
        expect(sql).toContain(
            'create table if not exists "rag"."rag_document_chunks"'
        );
    });

    // Some databases already have these tables, with customers' knowledge in
    // them, from the AI service's old self-setup.
    it('only adds what is missing and never drops anything', async () => {
        const sql = (await runMigration('up')).toLowerCase();

        expect(sql).not.toContain('drop ');
        expect(sql.match(/create (table|index|schema|extension) (?!if not exists)/g)).toBeNull();
    });

    it('keeps the knowledge data on rollback', async () => {
        expect(await runMigration('down')).toBe('');
    });
});
