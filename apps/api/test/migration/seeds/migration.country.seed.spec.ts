import { COUNTRY_SEED_DATA } from '@app/migration/data/country.data';
import { MigrationCountrySeed } from '@app/migration/seeds/migration.country.seed';

describe('MigrationCountrySeed.seeds', () => {
    const build = (existingAlpha2: string[]) => {
        const persisted: Array<{ alpha2Code: string }> = [];
        const em = {
            find: jest.fn(async () =>
                existingAlpha2.map(alpha2Code => ({ alpha2Code }))
            ),
            create: jest.fn((_entity: unknown, data: any) => data),
            persist: jest.fn((row: any) => persisted.push(row)),
            flush: jest.fn(async () => undefined),
        };
        const seed = new MigrationCountrySeed({ fork: () => em } as any);
        return { seed, em, persisted };
    };

    it('inserts every country on an empty table', async () => {
        const { seed, persisted } = build([]);

        await seed.seeds();

        expect(persisted).toHaveLength(COUNTRY_SEED_DATA.length);
        expect(persisted.map(c => c.alpha2Code)).toContain('VN');
    });

    it('skips countries that already exist, so re-running is safe', async () => {
        const { seed, em, persisted } = build(['ID', 'VN']);

        await seed.seeds();

        expect(persisted).toHaveLength(COUNTRY_SEED_DATA.length - 2);
        expect(persisted.map(c => c.alpha2Code)).not.toContain('ID');
        expect(em.find).toHaveBeenCalledTimes(1);
    });
});
