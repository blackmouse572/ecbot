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
            {} as any, // invitationService
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
            mockMemberService.verifyInvitationToken = jest
                .fn()
                .mockResolvedValue({ workspaceId: targetWorkspace.id });
            mockMemberService.joinWorkspaceViaInvitation = jest.fn();
            mockOwnerService.findOneById.mockResolvedValue(targetWorkspace);

            joinController = new WorkspaceMemberController(
                mockRootEm as any, // em
                {} as any, // userService
                mockMemberService as any,
                mockOwnerService as any, // workSpaceService (owner)
                mockRoleService as any,
                mockPaginationService as any,
                mockActivityService as any,
                {} as any, // invitationService
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
});
