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

const mockInvitationAccept = {
    acceptByToken: jest.fn(),
    acceptMineForWorkspace: jest.fn(),
    mapAccepted: jest.fn(({ workspace, role }) => ({
        joined: true,
        workspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
        },
        roleName: role.name,
    })),
};

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
        getUserWorkspaces: jest.fn(),
    };
    const mockRoleService = { findOne: jest.fn() };
    const mockPaginationService = { totalPage: jest.fn().mockReturnValue(1) };
    const mockActivityService = { createByUserWithWorkspace: jest.fn() };

    const workspace = { id: randomUUID(), name: 'Acme' } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new WorkspaceMemberController(
            {} as any, // userService
            mockMemberService as any,
            mockRoleService as any,
            mockPaginationService as any,
            mockActivityService as any,
            {} as any, // workspaceRequestService
            mockInvitationAccept as any
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

    describe('joinWorkspace (emailed link)', () => {
        it('accepts through the shared accept as the caller from the JWT', async () => {
            const caller = { id: 'caller-1' } as any;
            mockInvitationAccept.acceptByToken.mockResolvedValue({});

            await controller.joinWorkspace(caller, 'token');

            expect(mockInvitationAccept.acceptByToken).toHaveBeenCalledWith(
                'token',
                caller
            );
        });
    });

    describe('createJoinRequestByInvitationCode', () => {
        const caller = { id: 'caller-1', email: 'an@mail.com' } as any;
        const codeWorkspace = {
            id: 'ws-code',
            name: 'Moc',
            slug: 'moc',
            owner: { id: 'owner-1' },
        } as any;
        const mockRequestService = { createJoinWorkspaceRequest: jest.fn() };
        let codeController: WorkspaceMemberController;

        beforeEach(() => {
            (mockMemberService as any).findWorkspaceByInvitationCode = jest
                .fn()
                .mockResolvedValue(codeWorkspace);
            mockMemberService.isUserMemberOfWorkspace.mockResolvedValue(false);
            codeController = new WorkspaceMemberController(
                {} as any,
                mockMemberService as any,
                mockRoleService as any,
                mockPaginationService as any,
                mockActivityService as any,
                mockRequestService as any,
                mockInvitationAccept as any
            );
        });

        it('accepts my pending invitation to that workspace instead of filing a request', async () => {
            mockInvitationAccept.acceptMineForWorkspace.mockResolvedValue({
                workspace: codeWorkspace,
                role: { id: 'role-sales', name: 'Sales' },
            });

            const res = await codeController.createJoinRequestByInvitationCode(
                caller,
                'ABC123',
                {}
            );

            expect(
                mockInvitationAccept.acceptMineForWorkspace
            ).toHaveBeenCalledWith('ws-code', caller);
            expect(
                mockRequestService.createJoinWorkspaceRequest
            ).not.toHaveBeenCalled();
            // The invitation's role, not one from the code.
            expect(res.data).toEqual({
                joined: true,
                workspace: { id: 'ws-code', name: 'Moc', slug: 'moc' },
                roleName: 'Sales',
            });
        });

        it('files a join request as before when I have no invitation', async () => {
            mockInvitationAccept.acceptMineForWorkspace.mockResolvedValue(null);
            mockRequestService.createJoinWorkspaceRequest.mockResolvedValue({
                id: 'req-1',
            });

            const res = await codeController.createJoinRequestByInvitationCode(
                caller,
                'ABC123',
                { reason: 'hi' }
            );

            expect(
                mockRequestService.createJoinWorkspaceRequest
            ).toHaveBeenCalledWith(caller, 'owner-1', 'ABC123', 'hi');
            expect(res.data).toEqual({ joined: false, requestId: 'req-1' });
        });

        it('still refuses an existing member', async () => {
            mockMemberService.isUserMemberOfWorkspace.mockResolvedValue(true);

            await expect(
                codeController.createJoinRequestByInvitationCode(
                    caller,
                    'ABC123',
                    {}
                )
            ).rejects.toThrow(ConflictException);
            expect(
                mockInvitationAccept.acceptMineForWorkspace
            ).not.toHaveBeenCalled();
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

        let inviteController: WorkspaceMemberController;

        beforeEach(() => {
            jest.clearAllMocks();
            mockMemberService.getUserWorkspaces.mockResolvedValue([
                'ws-shared',
            ]);
            mockPaginationService.totalPage.mockReturnValue(1);
            mockUserService.mapShort.mockImplementation(user => user);

            inviteController = new WorkspaceMemberController(
                mockUserService as any,
                mockMemberService as any,
                mockRoleService as any,
                mockPaginationService as any,
                mockActivityService as any,
                {} as any, // workspaceRequestService
                mockInvitationAccept as any
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

        it('returns co-member fuzzy results with email (GET /:workspace/members already exposes it to the same audience)', async () => {
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
            expect(result.data[0].email).toBe('friend@mail.com');
            expect(mockUserService.mapShort).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'friend-1' })
            );
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

        it('respects the caller-provided offset for the exact-email match (page 2 must not repeat page 1)', async () => {
            mockMemberService.findAll.mockResolvedValueOnce([]);
            mockUserService.findAllWithRoleAndCountry.mockResolvedValue([]);
            mockUserService.getTotalWithRoleAndCountry.mockResolvedValue(0);

            await inviteController.getAvailableInviteMembers(
                callerId,
                workspace,
                'x@mail.com',
                { ...pagination, _offset: 20 }
            );

            expect(
                mockUserService.findAllWithRoleAndCountry
            ).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    paging: { limit: pagination._limit, offset: 20 },
                })
            );
        });
    });
});
