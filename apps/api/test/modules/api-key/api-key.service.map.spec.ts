import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

const service = new ApiKeyService(
    {} as any,
    { get: () => 'test' } as any,
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

const apiKey = {
    id: 'k1',
    name: 'Partner',
    type: ENUM_API_KEY_TYPE.DEFAULT,
    key: 'key_123',
    hash: 'hash_123',
    isActive: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-01-01'),
    createdBy: user,
    updatedBy: user,
} as any;

describe('ApiKeyService mapGet / mapList', () => {
    // The admin api key page shows who created and updated a key. A populated
    // user carries every column, so only the public fields may travel.
    it.each([
        ['mapGet', () => service.mapGet(apiKey)],
        ['mapList', () => service.mapList([apiKey])[0]],
    ])('%s returns only the public fields of the audit users', (_n, map) => {
        const view = JSON.parse(JSON.stringify(map()));

        for (const by of [view.createdBy, view.updatedBy]) {
            expect(by).toMatchObject({ id: 'u1', name: 'Ada' });
            expect(by).not.toHaveProperty('password');
            expect(by).not.toHaveProperty('salt');
            expect(by).not.toHaveProperty('mfaSecret');
        }
    });

    it('keeps the key fields the admin shows, and never the hash', () => {
        const view = JSON.parse(JSON.stringify(service.mapGet(apiKey)));

        expect(view).toMatchObject({
            id: 'k1',
            name: 'Partner',
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: 'key_123',
            isActive: true,
            startDate: '2026-01-01T00:00:00.000Z',
            endDate: '2027-01-01T00:00:00.000Z',
        });
        expect(view).not.toHaveProperty('hash');
    });
});
