import { checkLocalDatabase } from '../../scripts/guard-local-database';

// migration:fresh and schema:drop/fresh drop whatever DATABASE_URL points at,
// and dropping is the only way to clear the append-only audit log, so they
// must never reach a shared or production database.
describe('checkLocalDatabase', () => {
    it.each([
        'postgresql://postgres:password@localhost:5432/eccho',
        'postgresql://postgres:pg@127.0.0.1:55437/test',
        'postgresql://postgres:password@[::1]:5432/eccho',
        'postgresql://postgres:password@database:5432/eccho',
        'postgresql://postgres:password@postgres:5432/eccho',
    ])('allows a local database: %s', url => {
        expect(checkLocalDatabase({ DATABASE_URL: url })).toBeNull();
    });

    it('refuses a remote host', () => {
        expect(
            checkLocalDatabase({
                DATABASE_URL:
                    'postgresql://u:p@ep-cool-name.ap-southeast-1.aws.neon.tech/db',
            })
        ).toMatch(/ep-cool-name\.ap-southeast-1\.aws\.neon\.tech/);
    });

    it('refuses production even on a local host', () => {
        expect(
            checkLocalDatabase({
                APP_ENV: 'production',
                DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
            })
        ).toMatch(/production/);
    });

    it('refuses when DATABASE_URL is missing or not a URL', () => {
        expect(checkLocalDatabase({})).not.toBeNull();
        expect(
            checkLocalDatabase({ DATABASE_URL: 'not a url' })
        ).not.toBeNull();
    });
});
