// The global test setup (account/setup.ts) only stubs a subset of the workspace
// decorators; this controller also uses @WorkspaceOwnerProtected, so provide a
// complete stub here so importing the controller does not blow up at decoration.
jest.mock('@app/modules/workspace/decorators/workspace.decorator', () => ({
    WorkspaceOwnerProtected: () => () => {},
    WorkspaceMemberOrOwnerProtected: () => () => {},
    WorkspacePolicyAbilityProtected: () => () => {},
    WorkspacePayload: () => () => {},
}));

import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { RoleWorkspaceController } from '../../../../src/modules/role/controllers/role.workspace.controller';

// Unit-level tests for the controller's own branching. The guard stack
// (@WorkspaceOwnerProtected/@UserProtected/@AuthJwtAccessProtected/@ApiKeyProtected)
// and param pipes (RoleParsePipe/RoleIsActivePipe/RoleIsUsedPipe) are exercised
// by their own specs and by the e2e HTTP suite — here we pass already-resolved
// entities and assert the workspace-scoping + role-protection rules.

describe('RoleWorkspaceController', () => {
    let controller: RoleWorkspaceController;

    const mockRoleService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        mapList: jest.fn(),
        existByNameAndWorkspace: jest.fn(),
        createWithWorkspace: jest.fn(),
        update: jest.fn(),
        active: jest.fn(),
        inactive: jest.fn(),
        delete: jest.fn(),
        isWorkspaceOwnerRole: jest.fn(),
    };
    const mockPaginationService = { totalPage: jest.fn().mockReturnValue(1) };
    const mockActivityService = { createByUserWithWorkspace: jest.fn() };

    const workspace = { id: randomUUID() } as any;
    const user = { id: 'user-1', email: 'op@acme.test' } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new RoleWorkspaceController(
            mockPaginationService as any,
            mockRoleService as any,
            mockActivityService as any
        );
    });

    const validPermissions = [
        {
            subject: ENUM_POLICY_SUBJECT.CHATBOT,
            action: [ENUM_POLICY_ACTION.READ],
        },
    ];

    describe('list', () => {
        it('scopes the query to the workspace and returns mapped roles', async () => {
            const roles = [{ id: 'r1' }];
            mockRoleService.findAll.mockResolvedValue(roles);
            mockRoleService.getTotal.mockResolvedValue(1);
            mockRoleService.mapList.mockReturnValue(roles);

            const result = await controller.list(
                workspace,
                { _search: {}, _limit: 10, _offset: 0, _order: {} } as any,
                { isActive: true } as any
            );

            expect(mockRoleService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ workspace: workspace.id }),
                expect.any(Object)
            );
            expect(result.data).toBe(roles);
            expect(result._pagination.total).toBe(1);
        });
    });

    describe('getAvailableRolesForInvitation', () => {
        it('filters out owner roles', async () => {
            const roles = [{ id: 'owner' }, { id: 'member' }];
            mockRoleService.findAll.mockResolvedValue(roles);
            mockRoleService.isWorkspaceOwnerRole.mockImplementation(
                async (roleId: string) => roleId === 'owner'
            );
            mockRoleService.mapList.mockImplementation((r: any) => r);

            const result =
                await controller.getAvailableRolesForInvitation(workspace);

            expect(result.data).toEqual([{ id: 'member' }]);
        });
    });

    describe('create', () => {
        it('rejects a permission subject outside the allowed workspace set', async () => {
            await expect(
                controller.create(
                    workspace,
                    {
                        name: 'r',
                        description: 'd',
                        permissions: [
                            {
                                subject: ENUM_POLICY_SUBJECT.AUTH,
                                action: [ENUM_POLICY_ACTION.READ],
                            },
                        ],
                    } as any,
                    user
                )
            ).rejects.toThrow(ConflictException);
            expect(mockRoleService.createWithWorkspace).not.toHaveBeenCalled();
        });

        it('rejects a duplicate role name in the workspace', async () => {
            mockRoleService.existByNameAndWorkspace.mockResolvedValue(true);

            await expect(
                controller.create(
                    workspace,
                    {
                        name: 'dup',
                        description: 'd',
                        permissions: validPermissions,
                    } as any,
                    user
                )
            ).rejects.toThrow(ConflictException);
        });

        it('creates the role forcing type USER and returns its id', async () => {
            mockRoleService.existByNameAndWorkspace.mockResolvedValue(false);
            mockRoleService.createWithWorkspace.mockResolvedValue({
                id: 'new',
            });

            const result = await controller.create(
                workspace,
                {
                    name: 'ok',
                    description: 'd',
                    permissions: validPermissions,
                } as any,
                user
            );

            expect(mockRoleService.createWithWorkspace).toHaveBeenCalledWith(
                expect.objectContaining({ type: ENUM_POLICY_ROLE_TYPE.USER }),
                workspace
            );
            expect(result.data).toEqual({ id: 'new' });
        });
    });

    describe('update', () => {
        it('rejects when the role belongs to another workspace', async () => {
            const role = {
                id: 'r',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                workspace: { id: randomUUID() },
            } as any;

            await expect(
                controller.update(
                    workspace,
                    role,
                    {
                        description: 'x',
                        permissions: validPermissions,
                    } as any,
                    user
                )
            ).rejects.toThrow(ConflictException);
        });

        it('rejects updating a SUPER_ADMIN role', async () => {
            const role = {
                id: 'r',
                type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
                workspace: { id: workspace.id },
            } as any;

            await expect(
                controller.update(
                    workspace,
                    role,
                    {
                        description: 'x',
                        permissions: validPermissions,
                    } as any,
                    user
                )
            ).rejects.toThrow(ConflictException);
        });

        it('updates a workspace-owned USER role', async () => {
            const role = {
                id: 'r',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                workspace: { id: workspace.id },
            } as any;

            const result = await controller.update(
                workspace,
                role,
                {
                    description: 'x',
                    permissions: validPermissions,
                } as any,
                user
            );

            expect(mockRoleService.update).toHaveBeenCalled();
            expect(result.data).toEqual({ id: 'r' });
        });
    });

    describe('inactive', () => {
        it('rejects deactivating an owner role', async () => {
            const role = {
                id: 'r',
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER,
                workspace: { id: workspace.id },
            } as any;
            mockRoleService.isWorkspaceOwnerRole.mockResolvedValue(true);

            await expect(
                controller.inactive(workspace, role, user)
            ).rejects.toThrow(ConflictException);
            expect(mockRoleService.inactive).not.toHaveBeenCalled();
        });

        it('deactivates a non-owner role', async () => {
            const role = {
                id: 'r',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                workspace: { id: workspace.id },
            } as any;
            mockRoleService.isWorkspaceOwnerRole.mockResolvedValue(false);

            await controller.inactive(workspace, role, user);

            expect(mockRoleService.inactive).toHaveBeenCalledWith(role);
        });
    });

    describe('delete', () => {
        it('rejects deleting an owner role', async () => {
            const role = {
                id: 'r',
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER,
                workspace: { id: workspace.id },
            } as any;
            mockRoleService.isWorkspaceOwnerRole.mockResolvedValue(true);

            await expect(
                controller.delete(workspace, role, user)
            ).rejects.toThrow(ConflictException);
            expect(mockRoleService.delete).not.toHaveBeenCalled();
        });

        it('deletes a non-owner role', async () => {
            const role = {
                id: 'r',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                workspace: { id: workspace.id },
            } as any;
            mockRoleService.isWorkspaceOwnerRole.mockResolvedValue(false);

            await controller.delete(workspace, role, user);

            expect(mockRoleService.delete).toHaveBeenCalledWith(role);
        });
    });
});
