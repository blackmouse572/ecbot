import { Migration20261013130000_backfill_new_order_tag } from '../../../migrations/20261013130000_backfill_new_order_tag';

// Like the other migration specs, this checks the SQL shape: the suite has
// no database to run it against.
describe('Backfill migration: "New order" customer tag (#281)', () => {
    let queuedSql: string[];

    beforeEach(async () => {
        const migration = new Migration20261013130000_backfill_new_order_tag(
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
        expect(stmt).toContain("'Đơn hàng mới'");
        expect(stmt).toContain("'New order'");
        expect(stmt).toContain("'Khiếu nại'");
        expect(stmt).toContain("'Bực tức'");
    });

    it('leaves a workspace alone when it already has a tag with that name', () => {
        const [stmt] = queuedSql;
        expect(stmt).toContain('not exists');
        expect(stmt).toMatch(/t\."workspace_id"\s*=\s*w\."id"/);
        expect(stmt).toContain('t."deleted_at" is null');
    });
});
