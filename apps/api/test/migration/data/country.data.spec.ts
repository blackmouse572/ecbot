import { COUNTRY_SEED_DATA } from '@app/migration/data/country.data';

describe('COUNTRY_SEED_DATA', () => {
    it('covers every ISO 3166-1 country, including Vietnam', () => {
        expect(COUNTRY_SEED_DATA.length).toBeGreaterThanOrEqual(249);
        expect(COUNTRY_SEED_DATA).toContainEqual(
            expect.objectContaining({
                name: 'Vietnam',
                alpha2Code: 'VN',
                alpha3Code: 'VNM',
                numericCode: '704',
                phoneCode: ['84'],
                timeZone: 'Asia/Ho_Chi_Minh',
                currency: 'VND',
            })
        );
    });

    it.each(['alpha2Code', 'alpha3Code', 'numericCode'] as const)(
        'has unique %s values (the countries table has a unique constraint on each)',
        key => {
            const values = COUNTRY_SEED_DATA.map(c => c[key]);
            expect(new Set(values).size).toBe(values.length);
        }
    );

    it('fits the countries columns and uses real IANA time zones', () => {
        for (const c of COUNTRY_SEED_DATA) {
            expect(c.name.length).toBeGreaterThan(0);
            expect(c.name.length).toBeLessThanOrEqual(100);
            expect(c.alpha2Code).toMatch(/^[A-Z]{2}$/);
            expect(c.alpha3Code).toMatch(/^[A-Z]{3}$/);
            expect(c.numericCode).toMatch(/^\d{3}$/);
            expect(c.continent.length).toBeLessThanOrEqual(50);
            expect(c.currency.length).toBeLessThanOrEqual(10);
            expect(c.phoneCode.length).toBeGreaterThan(0);
            expect(() =>
                new Intl.DateTimeFormat('en', { timeZone: c.timeZone })
            ).not.toThrow();
        }
    });
});
