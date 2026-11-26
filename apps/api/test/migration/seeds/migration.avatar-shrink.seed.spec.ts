import sharp from 'sharp';
import { MigrationAvatarShrinkSeed } from 'src/migration/seeds/migration.avatar-shrink.seed';

async function dataUrl(size: number): Promise<string> {
    const raw = Buffer.alloc(size * size * 3);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919) % 256;
    const png = await sharp(raw, {
        raw: { width: size, height: size, channels: 3 },
    })
        .png()
        .toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
}

// Avatars stored before #634 are full-size base64 (up to ~750 KB each).
describe('MigrationAvatarShrinkSeed', () => {
    let execute: jest.Mock;
    let seed: MigrationAvatarShrinkSeed;
    let rows: Record<string, { id: string; sender_avatar: string }[]>;

    beforeEach(() => {
        rows = { conversations: [], contact_points: [] };
        execute = jest.fn(async (sql: string) => {
            if (!sql.startsWith('select')) return [];
            return sql.includes('contact_points')
                ? rows.contact_points
                : rows.conversations;
        });
        seed = new MigrationAvatarShrinkSeed({
            getConnection: () => ({ execute }),
        } as any);
    });

    it('only selects data-URL avatars above the small size', async () => {
        await seed.shrink(false);

        const selects = execute.mock.calls
            .map(([sql]) => sql as string)
            .filter(sql => sql.startsWith('select'));
        expect(selects).toHaveLength(2);
        for (const sql of selects) {
            expect(sql).toContain(`sender_avatar like 'data:%'`);
            expect(sql).toContain('length(sender_avatar) > 20000');
        }
    });

    it('rewrites big avatars in both tables as 128px JPEGs', async () => {
        const big = await dataUrl(800);
        rows.conversations = [{ id: 'c1', sender_avatar: big }];
        rows.contact_points = [{ id: 'p1', sender_avatar: big }];

        const counts = await seed.shrink(false);

        expect(counts).toEqual({ shrunk: 2, failed: 0 });
        const updates = execute.mock.calls.filter(([sql]) =>
            (sql as string).startsWith('update')
        );
        expect(updates.map(([sql]) => sql)).toEqual([
            'update conversations set sender_avatar = ? where id = ?',
            'update contact_points set sender_avatar = ? where id = ?',
        ]);
        const [avatar, id] = updates[0][1];
        expect(id).toBe('c1');
        expect(avatar).toMatch(/^data:image\/jpeg;base64,/);
        expect(avatar.length).toBeLessThan(20_000);
    });

    it('counts without writing on a dry run', async () => {
        rows.conversations = [{ id: 'c1', sender_avatar: await dataUrl(800) }];

        const counts = await seed.shrink(true);

        expect(counts).toEqual({ shrunk: 1, failed: 0 });
        expect(
            execute.mock.calls.some(([sql]) =>
                (sql as string).startsWith('update')
            )
        ).toBe(false);
    });

    it('leaves a row it cannot decode as is', async () => {
        rows.conversations = [
            {
                id: 'c1',
                sender_avatar: 'data:image/png;base64,bm90IGFuIGltYWdl',
            },
        ];

        const counts = await seed.shrink(false);

        expect(counts).toEqual({ shrunk: 0, failed: 1 });
    });
});
