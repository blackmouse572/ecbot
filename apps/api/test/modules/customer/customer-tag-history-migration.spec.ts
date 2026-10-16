import { Migration20261016145108_customer_tag_history } from '../../../migrations/20261016145108_customer_tag_history';

// Like the other migration specs, this checks the SQL shape: the suite has
// no database to run it against.
describe('Migration: customer tag history and system keys', () => {
    let queuedSql: string[];

    beforeEach(async () => {
        const migration = new Migration20261016145108_customer_tag_history(
            {} as any,
            {} as any
        );
        queuedSql = [];
        (migration as any).addSql = (sql: string) => {
            queuedSql.push(sql);
        };
        await migration.up();
    });

    const backfill = () =>
        queuedSql.filter(sql => sql.startsWith('update "customer_tags"'));

    it('keys a default tag only while its seeded name and emoji still match', () => {
        const positive = backfill().find(sql => sql.includes("'positive'"));
        expect(positive).toContain(`"name" in ('Positive', 'Hài lòng')`);
        expect(positive).toContain(`"emoji" = '😊'`);
        expect(positive).toContain('"deleted" = false');
    });

    it('keys at most one tag per workspace, the oldest', () => {
        expect(backfill()).toHaveLength(12);
        for (const sql of backfill()) {
            expect(sql).toContain('select distinct on ("workspace_id") "id"');
            expect(sql).toContain(
                'order by "workspace_id", "created_at", "id"'
            );
        }
    });

    it('erases tag history with the customer', () => {
        const fk = queuedSql.find(sql =>
            sql.includes('"customer_tag_events_customer_id_foreign"')
        );
        expect(fk).toContain('on delete cascade');
    });
});
