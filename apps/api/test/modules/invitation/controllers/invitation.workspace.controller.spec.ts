// Provide a complete workspace-decorator stub (global setup stubs only a subset)
// so importing the controller does not fail at decoration time.
jest.mock('@app/modules/workspace/decorators/workspace.decorator', () => ({
    WorkspaceOwnerProtected: () => () => {},
    WorkspaceMemberOrOwnerProtected: () => () => {},
    WorkspacePolicyAbilityProtected: () => () => {},
    WorkspacePayload: () => () => {},
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InvitationWorkspaceController } from '../../../../src/modules/invitation/controllers/invitation.workspace.controller';
import { ENUM_INVITATION_STATUS } from '../../../../src/modules/invitation/enums/invitation.enum';

describe('InvitationWorkspaceController', () => {
    let controller: InvitationWorkspaceController;

    const mockInvitationService = {
        findByWorkspace: jest.fn(),
        getTotalByWorkspace: jest.fn(),
        mapList: jest.fn(),
        findOneById: jest.fn(),
        mapDetail: jest.fn(),
        updateRole: jest.fn(),
        regenerateToken: jest.fn(),
        revoke: jest.fn(),
    };
    const mockPaginationService = { totalPage: jest.fn().mockReturnValue(1) };
    const mockJwtService = { sign: jest.fn().mockReturnValue('new-jwt') };
    const mockConfigService = {
        get: jest.fn((key: string) =>
            key === 'workspace.invitationKey' ? 'secret' : '7d'
        ),
    };
    const mockActivityService = { createByUserWithWorkspace: jest.fn() };

    const workspace = { id: randomUUID() } as any;
    const user = { id: 'user-1', email: 'op@acme.test' } as any;
    const inWorkspace = (over: Record<string, any> = {}) => ({
        id: randomUUID(),
        workspace: { id: workspace.id },
        status: ENUM_INVITATION_STATUS.PENDING,
        inviteeEmail: 'invitee@mail.com',
        role: { id: 'role' },
        ...over,
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockJwtService.sign.mockReturnValue('new-jwt');
        controller = new InvitationWorkspaceController(
            mockInvitationService as any,
            mockPaginationService as any,
            mockJwtService as any,
            mockConfigService as any,
            mockActivityService as any
        );
    });

    describe('getInvitations', () => {
        it('returns paginated invitations for the workspace', async () => {
            mockInvitationService.findByWorkspace.mockResolvedValue([
                { id: 'i' },
            ]);
            mockInvitationService.getTotalByWorkspace.mockResolvedValue(1);
            mockInvitationService.mapList.mockResolvedValue([{ id: 'i' }]);

            const result = await controller.getInvitations(
                workspace,
                { _search: {}, _limit: 10, _offset: 0, _order: {} } as any,
                {}
            );

            expect(mockInvitationService.findByWorkspace).toHaveBeenCalledWith(
                workspace.id,
                expect.objectContaining({ workspace: workspace.id }),
                expect.any(Object)
            );
            expect(result.data).toEqual([{ id: 'i' }]);
        });
    });

    describe('getInvitationDetail', () => {
        it('returns the mapped invitation of this workspace', async () => {
            const invitation = inWorkspace();
            mockInvitationService.findOneById.mockResolvedValue(invitation);
            mockInvitationService.mapDetail.mockResolvedValue({
                id: invitation.id,
            });

            const result = await controller.getInvitationDetail(
                workspace,
                invitation.id
            );

            expect(result.data).toEqual({ id: invitation.id });
        });

        it('throws NotFound for an invitation from another workspace', async () => {
            mockInvitationService.findOneById.mockResolvedValue(
                inWorkspace({ workspace: { id: randomUUID() } })
            );

            await expect(
                controller.getInvitationDetail(workspace, 'x')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateInvitationRole', () => {
        it('rejects updating a non-PENDING invitation', async () => {
            mockInvitationService.findOneById.mockResolvedValue(
                inWorkspace({ status: ENUM_INVITATION_STATUS.ACCEPTED })
            );

            await expect(
                controller.updateInvitationRole(
                    workspace,
                    'x',
                    { roleId: 'r' } as any,
                    user
                )
            ).rejects.toThrow(ConflictException);
        });

        it('updates the role of a PENDING invitation', async () => {
            mockInvitationService.findOneById.mockResolvedValue(inWorkspace());
            mockInvitationService.updateRole.mockResolvedValue({ id: 'i' });
            mockInvitationService.mapDetail.mockResolvedValue({ id: 'i' });

            const result = await controller.updateInvitationRole(
                workspace,
                'x',
                {
                    roleId: 'r',
                } as any,
                user
            );

            expect(mockInvitationService.updateRole).toHaveBeenCalledWith(
                'x',
                'r'
            );
            expect(result.data).toEqual({ id: 'i' });
        });
    });

    describe('regenerateInvitation', () => {
        it('rejects regenerating a non-PENDING invitation', async () => {
            mockInvitationService.findOneById.mockResolvedValue(
                inWorkspace({ status: ENUM_INVITATION_STATUS.REVOKED })
            );

            await expect(
                controller.regenerateInvitation('user', workspace, 'x', user)
            ).rejects.toThrow(ConflictException);
        });

        it('signs a new HS256 token and regenerates a PENDING invitation', async () => {
            mockInvitationService.findOneById.mockResolvedValue(inWorkspace());
            mockInvitationService.regenerateToken.mockResolvedValue({
                id: 'i',
            });
            mockInvitationService.mapDetail.mockResolvedValue({ id: 'i' });

            await controller.regenerateInvitation('user', workspace, 'x', user);

            expect(mockJwtService.sign).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    algorithm: 'HS256',
                    privateKey: 'secret',
                })
            );
            expect(mockInvitationService.regenerateToken).toHaveBeenCalledWith(
                'x',
                'new-jwt',
                expect.any(Date),
                expect.stringContaining('new-jwt')
            );
        });
    });

    describe('revokeInvitation', () => {
        it('rejects revoking a non-PENDING invitation', async () => {
            mockInvitationService.findOneById.mockResolvedValue(
                inWorkspace({ status: ENUM_INVITATION_STATUS.ACCEPTED })
            );

            await expect(
                controller.revokeInvitation('user', workspace, 'x', user)
            ).rejects.toThrow(ConflictException);
        });

        it('throws NotFound for an invitation from another workspace', async () => {
            mockInvitationService.findOneById.mockResolvedValue(
                inWorkspace({ workspace: { id: randomUUID() } })
            );

            await expect(
                controller.revokeInvitation('user', workspace, 'x', user)
            ).rejects.toThrow(NotFoundException);
        });

        it('revokes a PENDING invitation', async () => {
            mockInvitationService.findOneById.mockResolvedValue(inWorkspace());
            mockInvitationService.revoke.mockResolvedValue({ id: 'i' });
            mockInvitationService.mapDetail.mockResolvedValue({ id: 'i' });

            const result = await controller.revokeInvitation(
                'user',
                workspace,
                'x',
                user
            );

            expect(mockInvitationService.revoke).toHaveBeenCalledWith(
                'x',
                'user'
            );
            expect(result.data).toEqual({ id: 'i' });
        });
    });
});
