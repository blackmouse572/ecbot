import { Migration20260615000100_backfill_customers_from_conversations } from '../../../migrations/20260615000100_backfill_customers_from_conversations';

// TODO(#172-followup): full integration smoke against a real Postgres test DB.
// The existing apps/api Jest harness does NOT spin up a database; the
// conversation/customer/account specs in test/modules/ all mock the repository
// layer rather than executing SQL. Wiring an embedded harness (pg-mem doesn't
// support window functions / temp tables; testcontainers does but adds a heavy
// dependency) is gated on issue #(TBD). Until then, we verify the migration's
// shape — that it issues the expected sequence of statements and that the
// idempotency guard (`where not exists ...`) is present in the right places.

describe('Backfill migration — customers + contact_points from conversations', () => {
    let migration: Migration20260615000100_backfill_customers_from_conversations;
    let queuedSql: string[];

    beforeEach(() => {
        migration =
            new Migration20260615000100_backfill_customers_from_conversations(
                {} as any,
                {} as any
            );
        queuedSql = [];
        // The Migration base class uses addSql to queue statements; spy on it.
        (migration as any).addSql = (sql: string) => {
            queuedSql.push(sql);
        };
    });

    describe('up()', () => {
        beforeEach(async () => {
            await migration.up();
        });

        it('builds the _customer_backfill working set from conversations missing a contact_point_id', () => {
            const stmt = queuedSql[0];
            expect(stmt).toContain(
                'create temporary table "_customer_backfill"'
            );
            // Only conversations without a contact point are eligible — this is the
            // contract that makes a re-run skip already-backfilled rows.
            expect(stmt).toContain('c."contact_point_id" is null');
            // Tuple identity is (workspace, platform, externalSenderId) — verify the
            // PARTITION BY matches.
            expect(stmt).toMatch(
                /partition by\s+workspace_id\s*,\s*platform\s*,\s*external_sender_id/i
            );
        });

        it('reuses existing ContactPoints when the (workspace, platform, sender) already has one', () => {
            // Step 2: the UPDATE that swaps in pre-existing contact_point + customer ids.
            const stmt = queuedSql[1];
            expect(stmt).toContain('update "_customer_backfill" b');
            expect(stmt).toContain('from "contact_points" cp');
            expect(stmt).toMatch(/cp\."workspace_id"\s*=\s*b\."workspace_id"/);
            expect(stmt).toMatch(/cp\."platform"\s*=\s*b\."platform"/);
            expect(stmt).toMatch(
                /cp\."external_sender_id"\s*=\s*b\."external_sender_id"/
            );
        });

        it('only INSERTs new Customers for tuples that do NOT already have a ContactPoint (idempotency guard)', () => {
            const stmt = queuedSql[2];
            expect(stmt).toContain('insert into "customers"');
            expect(stmt).toContain('where not exists');
            expect(stmt).toContain('contact_points');
        });

        it('only INSERTs new ContactPoints for tuples that do NOT already have one (idempotency guard)', () => {
            const stmt = queuedSql[3];
            expect(stmt).toContain('insert into "contact_points"');
            expect(stmt).toContain('where not exists');
            expect(stmt).toContain('contact_points');
            // The new row carries the seeded display_sender_name from the conversation.sender_name
            expect(stmt).toContain('"display_sender_name"');
            expect(stmt).toContain('b."sender_name"');
        });

        it("links every matching conversation to its ContactPoint — and only those still NULL (won't overwrite already-linked rows)", () => {
            const stmt = queuedSql[4];
            expect(stmt).toContain('update "conversations" c');
            expect(stmt).toContain(
                '"contact_point_id" = b."new_contact_point_id"'
            );
            expect(stmt).toContain('c."contact_point_id" is null');
        });

        it('drops the temp table at the end so re-runs start clean', () => {
            const last = queuedSql[queuedSql.length - 1];
            expect(last).toContain('drop table');
            expect(last).toContain('_customer_backfill');
        });

        it('seeds Customer.name from conversation.sender_name (carry-over contract)', () => {
            const customerInsert = queuedSql[2];
            expect(customerInsert).toContain('"name"');
            expect(customerInsert).toContain('b."sender_name"');
        });
    });

    describe('down()', () => {
        it('detaches conversations and deletes the backfilled rows', async () => {
            await migration.down();
            expect(queuedSql).toEqual([
                expect.stringMatching(
                    /update\s+"conversations"\s+set\s+"contact_point_id"\s*=\s*null/i
                ),
                expect.stringMatching(/delete\s+from\s+"contact_points"/i),
                expect.stringMatching(/delete\s+from\s+"customers"/i),
            ]);
        });
    });

    describe('idempotency contract', () => {
        // The migration is supposed to be safe to re-run. We can't execute SQL
        // here, but we can confirm every INSERT is guarded so a second pass
        // would be a no-op for tuples that already have a contact point.
        it('every INSERT is guarded by a NOT EXISTS on the unique tuple', async () => {
            await migration.up();
            const inserts = queuedSql.filter(s => /insert into/i.test(s));
            expect(inserts.length).toBeGreaterThan(0);
            for (const stmt of inserts) {
                expect(stmt).toMatch(/where not exists/i);
            }
        });
    });
});
