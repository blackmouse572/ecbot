import { Migration20261013180000_add_order_placed_tag } from '../../../migrations/20261013180000_add_order_placed_tag';

// Like the other migration specs, this checks the SQL shape: the suite has
// no database to run it against.
describe('Migration: notify-only tags and the "Order placed" tag (#288)', () => {
    let queuedSql: string[];

    beforeEach(async () => {
        const migration = new Migration20261013180000_add_order_placed_tag(
            {} as any,
            {} as any
        );
        queuedSql = [];
        (migration as any).addSql = (sql: string) => {
            queuedSql.push(sql);
        };
        await migration.up();
    });

    it('adds the notifies_team flag, off for every existing tag', () => {
        expect(queuedSql[0]).toBe(
            'alter table "customer_tags" add column if not exists "notifies_team" boolean not null default false;'
        );
    });

    it('adds a notify-only tag to every live workspace', () => {
        const stmt = queuedSql[1];
        expect(queuedSql).toHaveLength(2);
        expect(stmt).toContain('insert into "customer_tags"');
        expect(stmt).toContain('"triggers_handoff", "notifies_team"');
        expect(stmt).toMatch(/false,\s*true\s+from "workspaces" w/);
        expect(stmt).toContain('w."deleted_at" is null');
    });

    it('names the tag in Vietnamese where the workspace was seeded in Vietnamese', () => {
        const stmt = queuedSql[1];
        expect(stmt).toContain("'Đã đặt đơn'");
        expect(stmt).toContain("'Order placed'");
        expect(stmt).toMatch(
            /where "deleted_at" is null\s+and "name" in \('Khiếu nại', 'Bực tức'\)/
        );
    });

    it('leaves a workspace alone when it already has a tag with that name', () => {
        const stmt = queuedSql[1];
        expect(stmt).toContain('not exists');
        expect(stmt).toMatch(/t\."workspace_id"\s*=\s*w\."id"/);
        expect(stmt).toContain("t.\"name\" in ('Order placed', 'Đã đặt đơn')");
    });
});
