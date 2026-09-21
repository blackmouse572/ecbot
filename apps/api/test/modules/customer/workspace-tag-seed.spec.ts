import { CUSTOMER_TAG_DEFAULTS } from '../../../src/modules/customer/constants/customer-tag.seed.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { WORKSPACE_DEFAULT_MEMBER_ROLES } from '../../../src/modules/workspace/constants/workspace.constant';
import { WorkspaceOwnerService } from '../../../src/modules/workspace/services/workspace.owner.service';

// What this spec asserts: the workspace creation hook seeds the 8 default
// customer tags atomically *inside* the same MikroORM session that the rest
// of the workspace setup runs in. This is the contract operators rely on —
// a workspace cannot exist without its baseline tag catalog, and a failure
// in seeding must roll back the workspace itself.

describe('Workspace creation — customer-tag seeding (contract)', () => {
    // Repos / services touched by `create()` before commit. Each is a minimal
    // stub that returns shapes the real service needs to keep going.
    let session: any;
    let em: any;

    let workSpaceRepository: any;
    let workspaceMemberRepository: any;
    let configService: any;
    let helperHashService: any;
    let jwtService: any;
    let helperStringService: any;
    let helperAvatarService: any;
    let workspaceMemberService: any;
    let roleService: any;
    let invitationService: any;
    let knowledgeBaseService: any;
    let customerTagService: any;
    let createdHook: any;

    let service: WorkspaceOwnerService;

    const owner = { id: 'user-owner-1' } as any;
    const dto = { name: 'Acme Workspace', image: '' } as any;

    beforeEach(() => {
        session = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
        };
        em = {
            fork: jest.fn(() => session),
            commit: jest.fn(),
            rollback: jest.fn(),
            getReference: jest.fn((cls: any, id: string) => ({ id })),
        };

        workSpaceRepository = {
            create: jest.fn().mockResolvedValue({
                id: 'ws-1',
                name: 'Acme Workspace',
            }),
        };
        workspaceMemberRepository = {
            create: jest.fn().mockResolvedValue({ id: 'member-1' }),
        };
        configService = {
            get: jest.fn().mockReturnValue('secret'),
        };
        helperHashService = {};
        jwtService = {};
        helperStringService = {
            random: jest.fn().mockReturnValue('CODE1234'),
        };
        helperAvatarService = {
            generateWorkspaceAvatar: jest
                .fn()
                .mockReturnValue('https://avatar.test/workspace'),
        };
        workspaceMemberService = {};
        roleService = {
            createWorkspaceOwnerRole: jest
                .fn()
                .mockResolvedValue({ id: 'role-owner' }),
            createManyWithWorkspace: jest.fn().mockResolvedValue([]),
        };
        invitationService = {};
        knowledgeBaseService = {
            create: jest.fn().mockResolvedValue({ id: 'kb-1' }),
        };
        customerTagService = {
            create: jest.fn().mockResolvedValue({ id: 'tag-x' }),
        };
        createdHook = {
            onWorkspaceCreated: jest.fn(),
            afterWorkspaceCreated: jest.fn(),
        };

        service = new WorkspaceOwnerService(
            em,
            workSpaceRepository,
            workspaceMemberRepository,
            configService,
            helperHashService,
            jwtService,
            helperStringService,
            helperAvatarService,
            workspaceMemberService,
            roleService,
            invitationService,
            knowledgeBaseService,
            createdHook as never,
            customerTagService
        );
    });

    it('seeds exactly 8 default customer tags on workspace creation', async () => {
        await service.create(owner, dto);

        expect(customerTagService.create).toHaveBeenCalledTimes(8);
        expect(CUSTOMER_TAG_DEFAULTS).toHaveLength(8);
    });

    it('creates default workspace roles with CUSTOMER manage permission', async () => {
        await service.create(owner, dto);

        expect(roleService.createManyWithWorkspace).toHaveBeenCalledWith(
            WORKSPACE_DEFAULT_MEMBER_ROLES,
            expect.objectContaining({ id: 'ws-1' }),
            { em: session }
        );
        for (const role of WORKSPACE_DEFAULT_MEMBER_ROLES) {
            expect(role.permissions).toEqual(
                expect.arrayContaining([
                    {
                        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                        action: [ENUM_POLICY_ACTION.MANAGE],
                    },
                ])
            );
        }
    });

    it('seeds every CUSTOMER_TAG_DEFAULTS entry with the correct (name, emoji, triggersHandoff)', async () => {
        await service.create(owner, dto);

        const seededByName = new Map<string, any>();
        for (const call of customerTagService.create.mock.calls) {
            const [payload] = call;
            seededByName.set(payload.name, payload);
        }

        for (const expected of CUSTOMER_TAG_DEFAULTS) {
            const seeded = seededByName.get(expected.name);
            expect(seeded).toBeDefined();
            expect(seeded.workspace).toBe('ws-1');
            expect(seeded.name).toBe(expected.name);
            expect(seeded.emoji).toBe(expected.emoji);
            expect(seeded.description).toBe(expected.description);
            expect(seeded.triggersHandoff).toBe(expected.triggersHandoff);
        }
    });

    it('Complaint and Angry are seeded with triggersHandoff=true; the other 6 are false', async () => {
        await service.create(owner, dto);

        const handoffTrue: string[] = [];
        const handoffFalse: string[] = [];
        for (const call of customerTagService.create.mock.calls) {
            const [payload] = call;
            (payload.triggersHandoff ? handoffTrue : handoffFalse).push(
                payload.name
            );
        }

        expect(handoffTrue.sort()).toEqual(['Angry', 'Complaint']);
        expect(handoffFalse).toHaveLength(6);
        expect(handoffFalse).not.toContain('Complaint');
        expect(handoffFalse).not.toContain('Angry');
    });

    it('seeds the tags INSIDE the workspace-creation transaction — every customerTagService.create receives the same em as the knowledgeBaseService.create call', async () => {
        await service.create(owner, dto);

        // The knowledge-base seed runs first in the transaction; capture its em.
        const [, kbOptions] = knowledgeBaseService.create.mock.calls[0];
        const transactionEm = kbOptions.em;
        expect(transactionEm).toBe(session);

        // Every tag seed must run on the SAME forked session em — that's how
        // a failure in tag seeding rolls back the whole workspace.
        for (const call of customerTagService.create.mock.calls) {
            const [, options] = call;
            expect(options).toBeDefined();
            expect(options.em).toBe(transactionEm);
        }
    });

    it('rolls back the workspace creation when tag seeding fails (atomicity)', async () => {
        customerTagService.create
            .mockResolvedValueOnce({ id: 'tag-1' })
            .mockRejectedValueOnce(new Error('seed failed'));

        await expect(service.create(owner, dto)).rejects.toThrow('seed failed');

        // Rollback/commit happen on the forked session, not the original em.
        expect(session.rollback).toHaveBeenCalledTimes(1);
        expect(session.commit).not.toHaveBeenCalled();
        expect(createdHook.afterWorkspaceCreated).not.toHaveBeenCalled();
    });

    // Phase one (in Ecbot Cloud: assign the default plan) must be undone by
    // the same rollback, so it gets the transaction's em — never the request
    // one.
    it('runs the workspace-created hook inside the transaction', async () => {
        const workspace = await service.create(owner, dto);

        expect(createdHook.onWorkspaceCreated).toHaveBeenCalledWith(
            expect.objectContaining({ id: workspace.id }),
            owner,
            { em: session }
        );
    });

    // Phase two (in Ecbot Cloud: warn the owner when no plan landed) must NOT
    // be undone by a rollback, so it waits until the workspace is committed.
    it('runs the follow-up hook after the commit', async () => {
        const commitOrder: string[] = [];
        session.commit.mockImplementation(() => commitOrder.push('commit'));
        createdHook.afterWorkspaceCreated.mockImplementation(() =>
            commitOrder.push('after')
        );

        const workspace = await service.create(owner, dto);

        expect(createdHook.afterWorkspaceCreated).toHaveBeenCalledWith(
            expect.objectContaining({ id: workspace.id }),
            owner
        );
        expect(commitOrder).toEqual(['commit', 'after']);
    });

    // The workspace is already committed; a failing follow-up must not undo it.
    it('still returns the workspace when the follow-up hook fails', async () => {
        createdHook.afterWorkspaceCreated.mockRejectedValue(
            new Error('notifications down')
        );

        await expect(service.create(owner, dto)).resolves.toEqual(
            expect.objectContaining({ id: 'ws-1' })
        );
        expect(session.rollback).not.toHaveBeenCalled();
    });

    // The public build has no hook provider at all: creation must still go
    // through, and the service holds no notification dependency to warn with.
    it('creates the workspace when no hook is provided', async () => {
        service = new WorkspaceOwnerService(
            em,
            workSpaceRepository,
            workspaceMemberRepository,
            configService,
            helperHashService,
            jwtService,
            helperStringService,
            helperAvatarService,
            workspaceMemberService,
            roleService,
            invitationService,
            knowledgeBaseService,
            undefined,
            customerTagService
        );

        await expect(service.create(owner, dto)).resolves.toEqual(
            expect.objectContaining({ id: 'ws-1' })
        );
        expect(session.commit).toHaveBeenCalledTimes(1);
        expect(session.rollback).not.toHaveBeenCalled();
    });
});
