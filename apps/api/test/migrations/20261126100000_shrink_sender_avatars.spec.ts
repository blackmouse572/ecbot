import sharp from 'sharp';
import { Migration20261126100000_shrink_sender_avatars as Migration } from '../../migrations/20261126100000_shrink_sender_avatars';

type Row = { id: string; sender_avatar: string };
type MigrationHarness = {
    execute: jest.Mock;
    up: () => Promise<void>;
    down: () => Promise<void>;
};

async function bigDataUrl(): Promise<string> {
    const size = 800;
    const raw = Buffer.alloc(size * size * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919) % 256;
    const png = await sharp(raw, {
        raw: { width: size, height: size, channels: 3 },
    })
        .png()
        .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
}

const harness = (rows: Record<string, Row[]>) => {
    const migration = Object.create(Migration.prototype) as MigrationHarness;
    migration.execute = jest.fn(async (sql: string) => {
        if (!sql.startsWith('select')) return [];
        return sql.includes('contact_points')
            ? (rows.contact_points ?? [])
            : (rows.conversations ?? []);
    });
    return migration;
};

const updates = (migration: MigrationHarness) =>
    migration.execute.mock.calls.filter(([sql]) =>
        (sql as string).startsWith('update')
    );

// Avatars stored before the resize are full-size base64 (up to ~750 KB).
describe('Migration20261126100000_shrink_sender_avatars', () => {
    it('only selects data-URL avatars above the small size', async () => {
        const migration = harness({});

        await migration.up();

        const selects = migration.execute.mock.calls.map(([sql]) => sql);
        expect(selects).toHaveLength(2);
        for (const sql of selects) {
            expect(sql).toContain(`"sender_avatar" like 'data:%'`);
            expect(sql).toContain(`length("sender_avatar") > 20000`);
        }
    });

    it('rewrites big avatars in both tables as 128px JPEGs', async () => {
        const big = await bigDataUrl();
        const migration = harness({
            conversations: [{ id: 'c1', sender_avatar: big }],
            contact_points: [{ id: 'p1', sender_avatar: big }],
        });

        await migration.up();

        const writes = updates(migration);
        expect(writes.map(([sql]) => sql)).toEqual([
            'update "conversations" set "sender_avatar" = ? where "id" = ?',
            'update "contact_points" set "sender_avatar" = ? where "id" = ?',
        ]);
        const [avatar, id] = writes[0][1];
        expect(id).toBe('c1');
        expect(avatar).toMatch(/^data:image\/jpeg;base64,/);
        expect(avatar.length).toBeLessThan(20_000);
        const meta = await sharp(
            Buffer.from(avatar.split(',')[1], 'base64')
        ).metadata();
        expect(meta.width).toBe(128);
    });

    it('leaves a row it cannot decode as is', async () => {
        const migration = harness({
            conversations: [
                {
                    id: 'c1',
                    sender_avatar: 'data:image/png;base64,bm90IGFuIGltYWdl',
                },
            ],
        });

        await migration.up();

        expect(updates(migration)).toHaveLength(0);
    });

    it('has nothing to undo', async () => {
        const migration = harness({});

        await migration.down();

        expect(migration.execute).not.toHaveBeenCalled();
    });
});
