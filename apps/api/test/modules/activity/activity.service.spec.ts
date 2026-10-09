import { ActivityService } from '../../../src/modules/activity/services/activity.service';

describe('ActivityService.mapList', () => {
    const build = () => new ActivityService({} as any, {} as any, {} as any);

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
    // In-memory stand-in for the Redis-backed cache-manager store.
    const cache = () => {
        const store = new Map<string, unknown>();
        return {
            get: jest.fn(async (key: string) => store.get(key)),
            set: jest.fn(async (key: string, value: unknown) => {
                store.set(key, value);
            }),
        };
    };
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
            cls(request) as any,
            cache() as any
        );

        const entity = await service.createByUser(user, create);

        expect(entity.ipAddress).toBe('203.0.113.7');
        expect(entity.userAgent).toBe('Mozilla/5.0 Test');
    });

    it('stamps ip and user agent on createByAdmin and createByUserWithWorkspace', async () => {
        const service = new ActivityService(
            repository() as any,
            cls(request) as any,
            cache() as any
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
            cls(undefined) as any,
            cache() as any
        );

        const entity = await service.createByUser(user, create);

        expect(entity.ipAddress).toBeUndefined();
        expect(entity.userAgent).toBeUndefined();
    });

    it('records a VIEW of a workspace record with one insert and no user lookup', async () => {
        const repo = repository();
        const service = new ActivityService(
            repo as any,
            cls(request) as any,
            cache() as any
        );

        await service.createView('u1', workspace, 'CUSTOMER' as any, {
            id: 'cust-1',
        });

        expect(repo.create).toHaveBeenCalledTimes(1);
        expect(repo.create.mock.calls[0][0]).toMatchObject({
            action: 'view',
            subject: 'CUSTOMER',
            metadata: { id: 'cust-1' },
            user: { id: 'u1' },
            by: { id: 'u1' },
            workspace,
            ipAddress: '203.0.113.7',
        });
    });

    it('records one VIEW per actor, workspace and record within the dedupe window', async () => {
        const repo = repository();
        const store = cache();
        const service = new ActivityService(
            repo as any,
            cls(request) as any,
            store as any
        );

        // The SPA polls messages every 5s: only the first read is written.
        await service.createView('u1', workspace, 'CONVERSATION' as any, {
            id: 'conv-1',
            resource: 'messages',
        });
        await service.createView('u1', workspace, 'CONVERSATION' as any, {
            id: 'conv-1',
            resource: 'messages',
        });
        await service.createView('u2', workspace, 'CONVERSATION' as any, {
            id: 'conv-1',
        });

        expect(repo.create).toHaveBeenCalledTimes(2);
        expect(store.set).toHaveBeenCalledWith(
            expect.any(String),
            true,
            10 * 60 * 1000
        );
    });

    it('never fails the read when the VIEW cannot be written', async () => {
        const repo = repository();
        repo.create.mockRejectedValueOnce(new Error('db down'));
        const store = cache();
        store.get.mockRejectedValueOnce(new Error('redis down'));
        const service = new ActivityService(
            repo as any,
            cls(request) as any,
            store as any
        );

        await expect(
            service.createView('u1', workspace, 'CUSTOMER' as any, {
                id: 'cust-1',
            })
        ).resolves.toBeUndefined();
        await expect(
            service.createView('u1', workspace, 'CUSTOMER' as any, {
                id: 'cust-1',
            })
        ).resolves.toBeUndefined();
    });

    it('attributes entries made during impersonation to the admin', async () => {
        const repo = repository();
        const service = new ActivityService(
            repo as any,
            cls({
                ...request,
                user: { user: 'u1', impersonatedBy: 'admin-1' },
            }) as any,
            cache() as any
        );

        await service.createView('u1', workspace, 'CUSTOMER' as any, {
            id: 'cust-1',
        });
        const entity = await service.createByUser(user, create);

        expect(repo.create.mock.calls[0][0]).toMatchObject({
            user: { id: 'u1' },
            by: { id: 'admin-1' },
            metadata: { id: 'cust-1', impersonatedBy: 'admin-1' },
        });
        expect(entity).toMatchObject({
            user: { id: 'u1' },
            by: { id: 'admin-1' },
            metadata: { impersonatedBy: 'admin-1' },
        });
    });

    it('truncates the user agent to 512 characters', async () => {
        const service = new ActivityService(
            repository() as any,
            cls({
                ...request,
                headers: { 'user-agent': 'x'.repeat(5000) },
            }) as any,
            cache() as any
        );

        const entity = await service.createByUser(user, create);

        expect(entity.userAgent).toHaveLength(512);
    });
});
