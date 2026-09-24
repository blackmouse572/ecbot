// Provide a complete workspace-decorator stub (the global setup only stubs a
// subset) so importing the controller does not fail at decoration time.
jest.mock('@app/modules/workspace/decorators/workspace.decorator', () => ({
    WorkspaceOwnerProtected: () => () => {},
    WorkspaceMemberOrOwnerProtected: () => () => {},
    WorkspacePolicyAbilityProtected: () => () => {},
    WorkspacePayload: () => () => {},
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WorkspaceMemberController } from '../../../../src/modules/workspace/controllers/workspace.member.controller';

// Unit tests for the controller's delegation + workspace-scoping. Auth/membership
// guards and the transactional join flow (POST /join) are covered by the e2e suite.

describe('WorkspaceMemberController', () => {
    let controller: WorkspaceMemberController;

    const mockMemberService = {
        findAll: jest.fn(),
        getTotal: jest.fn(),
        findOne: jest.fn(),
        mapList: jest.fn(),
        mapDetail: jest.fn(),
        updateRole: jest.fn(),
        delete: jest.fn(),
        removeRoleFromMember: jest.fn(),
        getMemberWorkspaceRoles: jest.fn(),
        isUserMemberOfWorkspace: jest.fn(),
        verifyInvitationToken: jest.fn(),
        joinWorkspaceViaInvitation: jest.fn(),
        getUserWorkspaces: jest.fn(),
    };
    const mockRoleService = { findOne: jest.fn() };
    const mockPaginationService = { totalPage: jest.fn().mockReturnValue(1) };
    const mockActivityService = { createByUserWithWorkspace: jest.fn() };

    const workspace = { id: randomUUID(), name: 'Acme' } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new WorkspaceMemberController(
            {} as any, // em
            {} as any, // userService
            mockMemberService as any,
            {} as any, // workSpaceService (owner)
            mockRoleService as any,
            mockPaginationService as any,
            mockActivityService as any,
            {} as any // workspaceRequestService
        );
    });

    describe('members', () => {
        it('returns paginated members scoped to the workspace', async () => {
            const members = [{ id: 'm1' }];
            mockMemberService.findAll.mockResolvedValue(members);
            mockMemberService.getTotal.mockResolvedValue(1);
            mockMemberService.mapList.mockReturnValue(members);

            const result = await controller.members('u', workspace, {
                _search: {},
                _limit: 10,
                _offset: 0,
                _order: {},
            } as any);

            expect(mockMemberService.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ workspace: workspace.id }),
                expect.any(Object)
            );
            expect(result.data).toBe(members);
            expect(result._pagination.total).toBe(1);
        });
    });

    describe('memberDetails', () => {
        it('returns the mapped member', async () => {
            const member = { id: 'm1' };
            mockMemberService.findOne.mockResolvedValue(member);
            mockMemberService.mapDetail.mockReturnValue(member);

            const result = await controller.memberDetails(workspace, 'u1');

            expect(result.data).toBe(member);
        });

        it('throws NotFound when the member is not in the workspace', async () => {
            mockMemberService.findOne.mockResolvedValue(null);

            await expect(
                controller.memberDetails(workspace, 'u1')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('assignRoleToMember', () => {
        it('throws when the member does not exist', async () => {
            mockMemberService.findOne.mockResolvedValue(null);
            mockRoleService.findOne.mockResolvedValue({ id: 'r' });

            await expect(
                controller.assignRoleToMember(workspace, 'm', 'r')
            ).rejects.toThrow(NotFoundException);
        });

        it('throws when the role does not exist', async () => {
            mockMemberService.findOne.mockResolvedValue({ id: 'm' });
            mockRoleService.findOne.mockResolvedValue(null);

            await expect(
                controller.assignRoleToMember(workspace, 'm', 'r')
            ).rejects.toThrow(NotFoundException);
        });

        it('delegates to updateRole when both exist', async () => {
            const member = { id: 'm' };
            const role = { id: 'r' };
            mockMemberService.findOne.mockResolvedValue(member);
            mockRoleService.findOne.mockResolvedValue(role);
            mockMemberService.updateRole.mockResolvedValue({ id: 'm' });

            const result = await controller.assignRoleToMember(
                workspace,
                'm',
                'r'
            );

            expect(mockMemberService.updateRole).toHaveBeenCalledWith(
                member,
                role
            );
            expect(result.data).toEqual({ id: 'm' });
        });
    });

    describe('removeRoleFromMember', () => {
        it('throws when the target is not a member', async () => {
            mockMemberService.isUserMemberOfWorkspace.mockResolvedValue(false);

            await expect(
                controller.removeRoleFromMember(workspace, 'm', 'r')
            ).rejects.toThrow(NotFoundException);
        });

        it('delegates removal for an existing member', async () => {
            mockMemberService.isUserMemberOfWorkspace.mockResolvedValue(true);

            await controller.removeRoleFromMember(workspace, 'm', 'r');

            expect(mockMemberService.removeRoleFromMember).toHaveBeenCalledWith(
                workspace.id,
                'm',
                'r'
            );
        });
    });

    describe('getMemberRoles', () => {
        it('throws when the target is not a member', async () => {
            mockMemberService.isUserMemberOfWorkspace.mockResolvedValue(false);

            await expect(
                controller.getMemberRoles(workspace, 'm')
            ).rejects.toThrow(NotFoundException);
        });

        it('returns the member roles', async () => {
            mockMemberService.isUserMemberOfWorkspace.mockResolvedValue(true);
            mockMemberService.getMemberWorkspaceRoles.mockResolvedValue([
                { id: 'r' },
            ]);

            const result = await controller.getMemberRoles(workspace, 'm');

            expect(result.data).toEqual([{ id: 'r' }]);
        });
    });

    describe('deleteMember', () => {
        it('throws when the member is not found', async () => {
            mockMemberService.findOne.mockResolvedValue(null);

            await expect(
                controller.deleteMember({ id: 'actor' } as any, workspace, 'u')
            ).rejects.toThrow(NotFoundException);
        });

        it('deletes the member and records an activity', async () => {
            const member = { id: 'm', user: { id: 'u', name: 'Bob' } };
            mockMemberService.findOne.mockResolvedValue(member);

            await controller.deleteMember(
                { id: 'actor' } as any,
                workspace,
                'u'
            );

            expect(mockMemberService.delete).toHaveBeenCalledWith(member);
            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalled();
        });
    });

    describe('joinWorkspace', () => {
        const caller = { id: 'caller-1', email: 'caller@mail.com' } as any;
        const targetWorkspace = { id: 'ws-target', name: 'Target' } as any;

        const mockEm = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
        };
        const mockRootEm = { fork: jest.fn(() => mockEm) };
        const mockOwnerService = { findOneById: jest.fn() };

        let joinController: WorkspaceMemberController;

        beforeEach(() => {
            jest.clearAllMocks();
            mockMemberService.isUserMemberOfWorkspace.mockResolvedValue(false);
            mockMemberService.verifyInvitationToken.mockResolvedValue({
                workspaceId: targetWorkspace.id,
            });
            mockOwnerService.findOneById.mockResolvedValue(targetWorkspace);

            joinController = new WorkspaceMemberController(
                mockRootEm as any, // em
                {} as any, // userService
                mockMemberService as any,
                mockOwnerService as any, // workSpaceService (owner)
                mockRoleService as any,
                mockPaginationService as any,
                mockActivityService as any,
                {} as any // workspaceRequestService
            );
        });

        it('rejects when the caller is already a member of the target workspace', async () => {
            mockMemberService.isUserMemberOfWorkspace.mockResolvedValue(true);

            await expect(
                joinController.joinWorkspace(caller, 'token')
            ).rejects.toThrow(ConflictException);

            expect(
                mockMemberService.joinWorkspaceViaInvitation
            ).not.toHaveBeenCalled();
        });

        it('joins via joinWorkspaceViaInvitation using the caller from the JWT', async () => {
            mockMemberService.joinWorkspaceViaInvitation.mockResolvedValue({
                workspace: targetWorkspace,
                roleId: 'role-1',
            });

            await joinController.joinWorkspace(caller, 'token');

            expect(
                mockMemberService.joinWorkspaceViaInvitation
            ).toHaveBeenCalledWith('token', caller.id, { em: mockEm });
            expect(mockEm.commit).toHaveBeenCalled();
            expect(mockEm.rollback).not.toHaveBeenCalled();
            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalled();
        });

        it('rolls back and propagates a rejected invitation (e.g. caller mismatch)', async () => {
            const rejection = new ConflictException('nope');
            mockMemberService.joinWorkspaceViaInvitation.mockRejectedValue(
                rejection
            );

            await expect(
                joinController.joinWorkspace(caller, 'token')
            ).rejects.toBe(rejection);

            expect(mockEm.rollback).toHaveBeenCalled();
            expect(mockEm.commit).not.toHaveBeenCalled();
        });
    });

    describe('getAvailableInviteMembers', () => {
        const callerId = 'caller-1';
        const currentMemberIds = ['existing-member'];
        const pagination = {
            _search: undefined,
            _limit: 10,
            _offset: 0,
            _order: {},
        } as any;

        const mockUserService = {
            findAllWithRoleAndCountry: jest.fn(),
            getTotalWithRoleAndCountry: jest.fn(),
            mapShort: jest.fn(),
        };
        const mockOwnerService = { getListByOwner: jest.fn() };

        let inviteController: WorkspaceMemberController;

        beforeEach(() => {
            jest.clearAllMocks();
            mockOwnerService.getListByOwner.mockResolvedValue([]);
            mockMemberService.getUserWorkspaces.mockResolvedValue([
                'ws-shared',
            ]);
            mockPaginationService.totalPage.mockReturnValue(1);

            inviteController = new WorkspaceMemberController(
                {} as any, // em
                mockUserService as any,
                mockMemberService as any,
                mockOwnerService as any,
                mockRoleService as any,
                mockPaginationService as any,
                mockActivityService as any,
                {} as any // workspaceRequestService
            );
        });

        it('scopes fuzzy name search to co-members only — a stranger is never queried', async () => {
            mockMemberService.findAll
                .mockResolvedValueOnce([]) // current members of the target workspace
                .mockResolvedValueOnce([{ user: { id: 'friend-1' } }]); // co-members across shared workspaces
            mockUserService.findAllWithRoleAndCountry.mockResolvedValue([]);
            mockUserService.getTotalWithRoleAndCountry.mockResolvedValue(0);

            await inviteController.getAvailableInviteMembers(
                callerId,
                workspace,
                'alice',
                {
                    ...pagination,
                    _search: { $or: [{ name: { $ilike: '%alice%' } }] },
                }
            );

            const find =
                mockUserService.findAllWithRoleAndCountry.mock.calls[0][0];
            expect(find.id.$in).toEqual(['friend-1']);
            expect(find.email).toBeUndefined();
        });

        it('excludes current workspace members from the co-member candidates', async () => {
            mockMemberService.findAll
                .mockResolvedValueOnce(
                    currentMemberIds.map(id => ({ user: { id } }))
                )
                .mockResolvedValueOnce([{ user: { id: 'friend-1' } }]);
            mockUserService.findAllWithRoleAndCountry.mockResolvedValue([]);
            mockUserService.getTotalWithRoleAndCountry.mockResolvedValue(0);

            await inviteController.getAvailableInviteMembers(
                callerId,
                workspace,
                undefined,
                pagination
            );

            const find =
                mockUserService.findAllWithRoleAndCountry.mock.calls[0][0];
            expect(find.id.$nin).toEqual(currentMemberIds);
        });

        it('returns co-member fuzzy results without an email field', async () => {
            mockMemberService.findAll
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ user: { id: 'friend-1' } }]);
            mockUserService.findAllWithRoleAndCountry.mockResolvedValue([
                { id: 'friend-1', name: 'Friend', email: 'friend@mail.com' },
            ]);
            mockUserService.getTotalWithRoleAndCountry.mockResolvedValue(1);

            const result = await inviteController.getAvailableInviteMembers(
                callerId,
                workspace,
                undefined,
                pagination
            );

            expect(result.data).toHaveLength(1);
            expect(result.data[0].name).toBe('Friend');
            expect(result.data[0].email).toBeUndefined();
            expect(mockUserService.mapShort).not.toHaveBeenCalled();
        });

        it('an exact email search finds a stranger, not limited to co-members', async () => {
            const stranger = {
                id: 'stranger-1',
                name: 'Stranger',
                email: 'stranger@mail.com',
            };
            mockMemberService.findAll.mockResolvedValueOnce([]);
            mockUserService.findAllWithRoleAndCountry.mockResolvedValue([
                stranger,
            ]);
            mockUserService.getTotalWithRoleAndCountry.mockResolvedValue(1);
            mockUserService.mapShort.mockImplementation(user => user);

            const result = await inviteController.getAvailableInviteMembers(
                callerId,
                workspace,
                'Stranger@Mail.com',
                pagination
            );

            const find =
                mockUserService.findAllWithRoleAndCountry.mock.calls[0][0];
            expect(find.email).toBe('stranger@mail.com');
            expect(find.id.$in).toBeUndefined();
            expect(result.data[0].email).toBe('stranger@mail.com');
            expect(mockMemberService.getUserWorkspaces).not.toHaveBeenCalled();
        });

        it('excludes current workspace members from the exact-email match', async () => {
            mockMemberService.findAll.mockResolvedValueOnce(
                currentMemberIds.map(id => ({ user: { id } }))
            );
            mockUserService.findAllWithRoleAndCountry.mockResolvedValue([]);
            mockUserService.getTotalWithRoleAndCountry.mockResolvedValue(0);

            await inviteController.getAvailableInviteMembers(
                callerId,
                workspace,
                'x@mail.com',
                pagination
            );

            const find =
                mockUserService.findAllWithRoleAndCountry.mock.calls[0][0];
            expect(find.id.$nin).toEqual(currentMemberIds);
        });
    });
});
