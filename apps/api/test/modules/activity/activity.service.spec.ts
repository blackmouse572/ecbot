import { ActivityService } from '../../../src/modules/activity/services/activity.service';

describe('ActivityService.mapList', () => {
    const build = () => new ActivityService({} as any, {} as any);

    const entity = () => ({
        id: 'act1',
        action: 'create',
        subject: 'CHATBOT',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        metadata: { id: 'c1', name: 'My Chatbot' },
        user: {
            id: 'u1',
            name: 'Alice',
            username: 'alice',
            email: 'alice@example.com',
            password: 'user-hash',
            salt: 'user-salt',
            role: {
                id: 'r1',
                permissions: [{ subject: 'CHATBOT', action: ['manage'] }],
            },
        },
        by: {
            id: 'b1',
            name: 'Bob',
            username: 'bob',
            email: 'bob@example.com',
            password: 'by-hash',
            salt: 'by-salt',
            role: {
                id: 'r1',
                permissions: [{ subject: 'CHATBOT', action: ['manage'] }],
            },
        },
        workspace: {
            id: 'w1',
            name: 'Acme',
            invitationCode: 'ABC123',
            owner: {
                id: 'u1',
                name: 'Alice',
                password: 'user-hash',
                role: { id: 'r1', permissions: [] },
            },
        },
    });

    it('collapses the populated user relation to its id, not the full entity', () => {
        const service = build();

        const [dto] = service.mapList([entity() as any]);

        expect(dto.user).toBe('u1');
        expect(typeof dto.user).toBe('string');
    });

    it('narrows `by` through UserShortResponseDto and drops role/credentials', () => {
        const service = build();

        const [dto] = service.mapList([entity() as any]);

        expect(dto.by).toMatchObject({
            id: 'b1',
            name: 'Bob',
            email: 'bob@example.com',
        });
        expect((dto.by as any).password).toBeUndefined();
        expect((dto.by as any).salt).toBeUndefined();
        expect((dto.by as any).role).toBeUndefined();
    });

    it('never exposes the populated workspace (with its nested owner/role)', () => {
        const service = build();

        const [dto] = service.mapList([entity() as any]);

        expect((dto as any).workspace).toBeUndefined();
    });
});

describe('ActivityService request context', () => {
    const repository = () => ({
        create: jest.fn(async (entity: any) => entity),
        getEntityManager: () => ({
            getReference: (_: unknown, id: string) => ({ id }),
        }),
    });
    const cls = (request?: any) => ({ get: jest.fn(() => request) });
    const request = {
        ip: '203.0.113.7',
        headers: { 'user-agent': 'Mozilla/5.0 Test' },
    };
    const user = { id: 'u1' } as any;
    const workspace = { id: 'w1' } as any;
    const create = { action: 'create', subject: 'USER' } as any;

    it('stamps ip and user agent from the current request on createByUser', async () => {
        const service = new ActivityService(
            repository() as any,
            cls(request) as any
        );

        const entity = await service.createByUser(user, create);

        expect(entity.ipAddress).toBe('203.0.113.7');
        expect(entity.userAgent).toBe('Mozilla/5.0 Test');
    });

    it('stamps ip and user agent on createByAdmin and createByUserWithWorkspace', async () => {
        const service = new ActivityService(
            repository() as any,
            cls(request) as any
        );

        const byAdmin = await service.createByAdmin(user, 'admin-1', create);
        const inWorkspace = await service.createByUserWithWorkspace(
            user,
            workspace,
            create
        );

        expect(byAdmin.ipAddress).toBe('203.0.113.7');
        expect(inWorkspace.userAgent).toBe('Mozilla/5.0 Test');
    });

    it('leaves ip and user agent empty outside a request (seeds, workers)', async () => {
        const service = new ActivityService(
            repository() as any,
            cls(undefined) as any
        );

        const entity = await service.createByUser(user, create);

        expect(entity.ipAddress).toBeUndefined();
        expect(entity.userAgent).toBeUndefined();
    });

    it('records a VIEW of a workspace record with one insert and no user lookup', async () => {
        const repo = repository();
        const service = new ActivityService(repo as any, cls(request) as any);

        const entity = await service.createView(
            'u1',
            workspace,
            'CUSTOMER' as any,
            { id: 'cust-1' }
        );

        expect(repo.create).toHaveBeenCalledTimes(1);
        expect(entity).toMatchObject({
            action: 'view',
            subject: 'CUSTOMER',
            metadata: { id: 'cust-1' },
            user: { id: 'u1' },
            by: { id: 'u1' },
            workspace,
            ipAddress: '203.0.113.7',
        });
    });
});
