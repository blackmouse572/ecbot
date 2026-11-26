import { ClientCredentialService } from 'src/modules/client-credential/services/client-credential.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

const service = new ClientCredentialService(
    { get: () => 'test' } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
);

const user = Object.assign(new UserEntity(), {
    id: 'u1',
    name: 'Ada',
    username: 'ada',
    email: 'ada@example.com',
    password: 'argon2-hash',
    salt: 'salt',
    mfaSecret: 'secret',
});

describe('ClientCredentialService.mapList', () => {
    // The app's client credentials list shows who created each credential.
    // A populated user carries every column, so only the public fields may
    // travel to workspace members.
    it('returns only the public fields of the audit users', () => {
        const [mapped] = service.mapList([
            {
                id: 'cc1',
                name: 'Shop sync',
                key: 'test_abc',
                hash: 'hash_abc',
                isActive: true,
                createdBy: user,
                updatedBy: user,
            } as any,
        ]);
        const view = JSON.parse(JSON.stringify(mapped));

        for (const by of [view.createdBy, view.updatedBy]) {
            expect(by).toMatchObject({
                id: 'u1',
                name: 'Ada',
                email: 'ada@example.com',
            });
            expect(by).not.toHaveProperty('password');
            expect(by).not.toHaveProperty('salt');
            expect(by).not.toHaveProperty('mfaSecret');
        }
        expect(view).toMatchObject({
            id: 'cc1',
            name: 'Shop sync',
            key: 'test_abc',
            isActive: true,
        });
        expect(view).not.toHaveProperty('hash');
    });
});
