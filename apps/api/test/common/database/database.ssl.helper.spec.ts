import { DatabaseSslHelper } from 'src/common/database/helpers/database.ssl.helper';

describe('DatabaseSslHelper.driverOptions', () => {
    it('returns no driver options when TLS is off', () => {
        expect(DatabaseSslHelper.driverOptions(false)).toBeUndefined();
    });

    // An unverified certificate lets anyone on the path impersonate the DB.
    it('verifies the server certificate when TLS is on', () => {
        expect(DatabaseSslHelper.driverOptions(true)).toEqual({
            connection: { ssl: { rejectUnauthorized: true } },
        });
    });

    it('trusts a custom CA given as one line with escaped newlines', () => {
        const options = DatabaseSslHelper.driverOptions(
            true,
            '-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----'
        );

        expect(options?.connection.ssl).toEqual({
            rejectUnauthorized: true,
            ca: '-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----',
        });
    });
});
