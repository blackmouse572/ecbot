import { ENUM_ACTIVITY_ACTION } from '../../../src/modules/activity/enums/activity.enum';
import { ActivityService } from '../../../src/modules/activity/services/activity.service';
import { ENUM_POLICY_SUBJECT } from '../../../src/modules/policy/enums/policy.enum';

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

    it('attributes entries made during impersonation to the admin', async () => {
        const repo = repository();
        const service = new ActivityService(
            repo as any,
            cls({
                ...request,
                user: { user: 'u1', impersonatedBy: 'admin-1' },
            }) as any
        );

        const entity = await service.createByUser(user, create);

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
            }) as any
        );

        const entity = await service.createByUser(user, create);

        expect(entity.userAgent).toHaveLength(512);
    });
});

describe('ActivityService.createByAdminWithWorkspace', () => {
    it('createByAdminWithWorkspace attaches the workspace and a by-reference staff actor', async () => {
        const create = jest.fn(entity => entity);
        const service = new ActivityService(
            {
                create,
                getEntityManager: () => ({
                    getReference: (_entity: unknown, id: string) => ({ id }),
                }),
            } as any,
            // No request context: `build` reads only `cls.get`.
            { get: () => undefined } as any
        );
        const owner = { id: 'u-owner' } as any;
        const workspace = { id: 'w1' } as any;

        await service.createByAdminWithWorkspace(owner, 'staff-1', workspace, {
            action: ENUM_ACTIVITY_ACTION.SUBSCRIPTION_CHANGE_PLAN,
            subject: ENUM_POLICY_SUBJECT.PLAN,
            metadata: { note: 'partner deal' },
        });

        const entity = create.mock.calls[0][0];
        expect(entity.user).toBe(owner);
        expect(entity.workspace).toBe(workspace);
        expect(entity.by).toEqual({ id: 'staff-1' });
        expect(entity.action).toBe('subscription_change_plan');
        expect(entity.metadata).toEqual({ note: 'partner deal' });
    });
});

describe('ActivityService.mapAdminList', () => {
    const service = new ActivityService({} as any, {} as any);
    const person = (id: string, name: string) => ({
        id,
        name,
        username: name.toLowerCase(),
        email: `${name.toLowerCase()}@example.com`,
        password: `${id}-hash`,
        salt: `${id}-salt`,
        role: { id: 'r1', permissions: [] },
    });
    const entity = (workspace?: Record<string, unknown>) => ({
        id: 'act1',
        action: ENUM_ACTIVITY_ACTION.UPDATE,
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
        createdAt: new Date('2026-10-15T00:00:00.000Z'),
        metadata: { old: { status: 'ACTIVE' }, new: { status: 'SUSPENDED' } },
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
        user: person('u1', 'Alice'),
        by: person('b1', 'Bob'),
        workspace,
    });

    it('shows who acted, on whose account, in which workspace, without credentials', () => {
        const [dto] = service.mapAdminList([
            entity({
                id: 'w1',
                name: 'Acme',
                slug: 'acme',
                invitationCode: 'ABC123',
                owner: person('u1', 'Alice'),
            }) as any,
        ]);

        expect(dto).toMatchObject({
            id: 'act1',
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.WORKSPACE,
            metadata: {
                old: { status: 'ACTIVE' },
                new: { status: 'SUSPENDED' },
            },
            ipAddress: '10.0.0.1',
            userAgent: 'Mozilla/5.0',
            user: { id: 'u1', name: 'Alice', email: 'alice@example.com' },
            by: { id: 'b1', name: 'Bob', email: 'bob@example.com' },
            workspace: { id: 'w1', name: 'Acme', slug: 'acme' },
        });
        const json = JSON.stringify(dto);
        expect(json).not.toContain('hash');
        expect(json).not.toContain('salt');
        expect(json).not.toContain('ABC123');
        expect(json).not.toContain('permissions');
    });

    it('leaves the workspace empty for activities outside one', () => {
        const [dto] = service.mapAdminList([entity() as any]);

        expect(dto.workspace).toBeUndefined();
    });
});
