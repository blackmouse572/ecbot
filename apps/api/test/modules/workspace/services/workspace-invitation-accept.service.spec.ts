import { ConflictException, NotFoundException } from '@nestjs/common';
import { REQUEST_STATUS } from '../../../../src/modules/requests/constant/requests.constant';
import { WorkspaceInvitationAcceptService } from '../../../../src/modules/workspace/services/workspace-invitation-accept.service';

describe('WorkspaceInvitationAcceptService', () => {
    const tx = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        nativeUpdate: jest.fn(),
    };
    const em = { fork: jest.fn(() => tx) };
    const memberService = {
        acceptInvitation: jest.fn(),
        isUserMemberOfWorkspace: jest.fn(),
        getUserWorkspaces: jest.fn(),
        verifyInvitationToken: jest.fn(),
    };
    const invitationService = {
        findPendingForEmail: jest.fn(),
        findOneByToken: jest.fn(),
        revoke: jest.fn(),
    };
    const activityService = { createByUserWithWorkspace: jest.fn() };
    const memberJoinedEmail = { send: jest.fn() };

    const service = new WorkspaceInvitationAcceptService(
        em as any,
        memberService as any,
        invitationService as any,
        activityService as any,
        memberJoinedEmail as any
    );

    const me = {
        id: 'user-me',
        email: 'me@mail.com',
        username: 'me',
        verification: { email: true },
    } as any;
    const unverified = { ...me, verification: { email: false } } as any;
    const workspace = { id: 'ws-1', name: 'Moc', slug: 'moc', avatar: 'a.png' };
    const invitation = {
        id: 'inv-1',
        workspace,
        inviter: { name: ' Lan ', email: 'lan@mail.com' },
        role: null,
        expiresAt: new Date('2026-11-15T00:00:00Z'),
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        memberService.isUserMemberOfWorkspace.mockResolvedValue(false);
        memberService.getUserWorkspaces.mockResolvedValue([]);
        memberService.acceptInvitation.mockResolvedValue({
            workspace,
            role: { id: 'role-member', name: 'Member' },
        });
    });

    describe('listMine', () => {
        it('looks up my own account email, never a client-sent one', async () => {
            invitationService.findPendingForEmail.mockResolvedValue([
                invitation,
            ]);

            const list = await service.listMine(me);

            expect(invitationService.findPendingForEmail).toHaveBeenCalledWith(
                'me@mail.com'
            );
            expect(list).toEqual([invitation]);
        });

        it('returns none while my email is not verified', async () => {
            expect(await service.listMine(unverified)).toEqual([]);
            expect(
                invitationService.findPendingForEmail
            ).not.toHaveBeenCalled();
        });

        it('hides invitations to workspaces I already joined', async () => {
            invitationService.findPendingForEmail.mockResolvedValue([
                invitation,
            ]);
            memberService.getUserWorkspaces.mockResolvedValue(['ws-1']);

            expect(await service.listMine(me)).toEqual([]);
        });
    });

    describe('mapMine', () => {
        it('falls back to Member for a role-less invitation and trims the inviter', () => {
            expect(service.mapMine(invitation)).toEqual({
                id: 'inv-1',
                workspace,
                inviterName: 'Lan',
                roleName: 'Member',
                expiresAt: invitation.expiresAt,
            });
        });

        it('shows the custom role name', () => {
            expect(
                service.mapMine({ ...invitation, role: { name: 'Sales' } })
                    .roleName
            ).toBe('Sales');
        });
    });

    describe('acceptMine', () => {
        it("404s another user's invitation (my email finds nothing) and joins nobody", async () => {
            invitationService.findPendingForEmail.mockResolvedValue([]);

            await expect(service.acceptMine('inv-other', me)).rejects.toThrow(
                NotFoundException
            );
            expect(invitationService.findPendingForEmail).toHaveBeenCalledWith(
                'me@mail.com',
                { id: 'inv-other' }
            );
            expect(memberService.acceptInvitation).not.toHaveBeenCalled();
        });

        it('404s while my email is not verified', async () => {
            await expect(
                service.acceptMine('inv-1', unverified)
            ).rejects.toThrow(NotFoundException);
            expect(
                invitationService.findPendingForEmail
            ).not.toHaveBeenCalled();
        });

        it('accepts in one transaction, cancels my pending join request, then emails the owner', async () => {
            invitationService.findPendingForEmail.mockResolvedValue([
                invitation,
            ]);

            const result = await service.acceptMine('inv-1', me);

            expect(memberService.acceptInvitation).toHaveBeenCalledWith(
                invitation,
                'user-me',
                { em: tx }
            );
            expect(tx.nativeUpdate).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    requestFrom: 'user-me',
                    workspace: 'ws-1',
                    status: REQUEST_STATUS.PENDING,
                }),
                { status: REQUEST_STATUS.CANCELLED }
            );
            expect(tx.commit).toHaveBeenCalled();
            expect(memberJoinedEmail.send).toHaveBeenCalledWith(
                'ws-1',
                'user-me'
            );
            expect(service.mapAccepted(result)).toEqual({
                joined: true,
                workspace,
                roleName: 'Member',
            });
        });

        it('rolls back and sends no email when the accept fails', async () => {
            invitationService.findPendingForEmail.mockResolvedValue([
                invitation,
            ]);
            const failure = new ConflictException('no seat');
            memberService.acceptInvitation.mockRejectedValue(failure);

            await expect(service.acceptMine('inv-1', me)).rejects.toBe(failure);
            expect(tx.rollback).toHaveBeenCalled();
            expect(tx.commit).not.toHaveBeenCalled();
            expect(memberJoinedEmail.send).not.toHaveBeenCalled();
        });

        it('refuses when I am already a member', async () => {
            invitationService.findPendingForEmail.mockResolvedValue([
                invitation,
            ]);
            memberService.isUserMemberOfWorkspace.mockResolvedValue(true);

            await expect(service.acceptMine('inv-1', me)).rejects.toThrow(
                ConflictException
            );
            expect(memberService.acceptInvitation).not.toHaveBeenCalled();
        });
    });

    describe('declineMine', () => {
        it('revokes it as me, so it leaves the owner pending list', async () => {
            invitationService.findPendingForEmail.mockResolvedValue([
                invitation,
            ]);

            await service.declineMine('inv-1', me);

            expect(invitationService.revoke).toHaveBeenCalledWith(
                'inv-1',
                'user-me'
            );
        });

        it("404s another user's invitation", async () => {
            invitationService.findPendingForEmail.mockResolvedValue([]);

            await expect(service.declineMine('inv-other', me)).rejects.toThrow(
                NotFoundException
            );
            expect(invitationService.revoke).not.toHaveBeenCalled();
        });
    });

    describe('acceptMineForWorkspace (join code)', () => {
        it('accepts my pending invitation to that workspace', async () => {
            invitationService.findPendingForEmail.mockResolvedValue([
                invitation,
            ]);

            const result = await service.acceptMineForWorkspace('ws-1', me);

            expect(invitationService.findPendingForEmail).toHaveBeenCalledWith(
                'me@mail.com',
                { workspace: 'ws-1' }
            );
            expect(result?.role.name).toBe('Member');
            expect(tx.nativeUpdate).toHaveBeenCalled();
        });

        it('returns null (file a request) when I have none, or am unverified', async () => {
            invitationService.findPendingForEmail.mockResolvedValue([]);

            expect(await service.acceptMineForWorkspace('ws-1', me)).toBeNull();
            expect(
                await service.acceptMineForWorkspace('ws-1', unverified)
            ).toBeNull();
            expect(memberService.acceptInvitation).not.toHaveBeenCalled();
        });
    });

    describe('acceptByToken (emailed link)', () => {
        it('verifies the token and accepts its invitation row', async () => {
            invitationService.findOneByToken.mockResolvedValue(invitation);

            await service.acceptByToken('tok', me);

            expect(memberService.verifyInvitationToken).toHaveBeenCalledWith(
                'tok'
            );
            expect(memberService.acceptInvitation).toHaveBeenCalledWith(
                invitation,
                'user-me',
                { em: tx }
            );
        });
    });
});
