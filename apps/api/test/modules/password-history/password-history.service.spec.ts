import { PasswordHistoryService } from '../../../src/modules/password-history/services/password-history.service';

describe('PasswordHistoryService.mapAdminList', () => {
    const build = () =>
        new PasswordHistoryService(
            { get: jest.fn(() => 3600) } as any,
            {} as any,
            {} as any,
            {} as any
        );

    const entity = () => ({
        id: 'ph1',
        type: 'CHANGE',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        expiredAt: new Date('2026-10-01T00:00:00.000Z'),
        password: 'secret-hash',
        user: {
            id: 'u1',
            name: 'Alice',
            username: 'alice',
            email: 'alice@example.com',
            password: 'user-hash',
            salt: 'user-salt',
        },
        by: {
            id: 'a1',
            name: 'Admin',
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin-hash',
            salt: 'admin-salt',
        },
    });

    it('narrows populated user/by to meta and drops every password field', () => {
        const service = build();

        const [dto] = service.mapAdminList([entity() as any]);

        expect(dto.user).toMatchObject({
            id: 'u1',
            name: 'Alice',
            username: 'alice',
            email: 'alice@example.com',
        });
        expect(dto.by).toMatchObject({
            id: 'a1',
            name: 'Admin',
            email: 'admin@example.com',
        });
        expect((dto.user as any).password).toBeUndefined();
        expect((dto.by as any).password).toBeUndefined();
        expect((dto as any).password).toBeUndefined();
        expect(dto.type).toBe('CHANGE');
    });

    it('leaves user/by undefined when the relations are not populated', () => {
        const service = build();
        const raw = entity();
        raw.user = undefined as any;
        raw.by = undefined as any;

        const [dto] = service.mapAdminList([raw as any]);

        expect(dto.user).toBeUndefined();
        expect(dto.by).toBeUndefined();
    });
});

describe('PasswordHistoryService.mapList', () => {
    const build = () =>
        new PasswordHistoryService(
            { get: jest.fn(() => 3600) } as any,
            {} as any,
            {} as any,
            {} as any
        );

    const entity = () => ({
        id: 'ph1',
        type: 'CHANGE',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
        expiredAt: new Date('2026-10-01T00:00:00.000Z'),
        password: 'secret-hash',
        user: {
            id: 'u1',
            name: 'Alice',
            username: 'alice',
            email: 'alice@example.com',
            password: 'user-hash',
            salt: 'user-salt',
        },
        by: {
            id: 'a1',
            name: 'Admin',
            username: 'admin',
            email: 'admin@example.com',
            password: 'admin-hash',
            salt: 'admin-salt',
        },
    });

    it('collapses the populated user relation to its id and leaks no credentials', () => {
        const service = build();

        const [dto] = service.mapList([entity() as any]);

        // `user` is the declared FK id string, not the populated entity — a
        // regression that left the entity in place would make it an object.
        expect(dto.user).toBe('u1');
        expect(typeof dto.user).toBe('string');
        // `by` narrows through UserShortResponseDto (inherits @Exclude password/salt).
        expect((dto.by as any).password).toBeUndefined();
        expect((dto.by as any).salt).toBeUndefined();
        expect((dto as any).password).toBeUndefined();
    });
});
