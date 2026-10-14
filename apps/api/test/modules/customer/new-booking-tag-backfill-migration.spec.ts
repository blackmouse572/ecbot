import { Migration20261013170000_backfill_new_booking_tag } from '../../../migrations/20261013170000_backfill_new_booking_tag';

// Like the other migration specs, this checks the SQL shape: the suite has
// no database to run it against.
describe('Backfill migration: "New booking" customer tag (#291)', () => {
    let queuedSql: string[];

    beforeEach(async () => {
        const migration = new Migration20261013170000_backfill_new_booking_tag(
            {} as any,
            {} as any
        );
        queuedSql = [];
        (migration as any).addSql = (sql: string) => {
            queuedSql.push(sql);
        };
        await migration.up();
    });

    it('adds a handoff-triggering tag to every live workspace', () => {
        const [stmt] = queuedSql;
        expect(queuedSql).toHaveLength(1);
        expect(stmt).toContain('insert into "customer_tags"');
        expect(stmt).toContain('"triggers_handoff"');
        expect(stmt).toMatch(/from "workspaces" w/);
        expect(stmt).toContain('w."deleted_at" is null');
    });

    it('names the tag in Vietnamese where the workspace was seeded in Vietnamese', () => {
        const [stmt] = queuedSql;
        expect(stmt).toContain("'Lịch hẹn mới'");
        expect(stmt).toContain("'New booking'");
        expect(stmt).toContain("'Khiếu nại'");
        expect(stmt).toContain("'Bực tức'");
        // Only a live tag counts: a workspace that deleted "Khiếu nại" is
        // not treated as Vietnamese.
        expect(stmt).toMatch(
            /where "deleted_at" is null\s+and "name" in \('Khiếu nại', 'Bực tức'\)/
        );
    });

    it('leaves a workspace alone when it already has a tag with that name', () => {
        const [stmt] = queuedSql;
        expect(stmt).toContain('not exists');
        expect(stmt).toMatch(/t\."workspace_id"\s*=\s*w\."id"/);
        expect(stmt).toContain('t."deleted_at" is null');
    });
});
