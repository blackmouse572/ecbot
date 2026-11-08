import {
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { RoleService } from '../../../../src/modules/role/services/role.service';
import { UserService } from '../../../../src/modules/user/services/user.service';
import { InvitationService } from '../../../../src/modules/invitation/services/invitation.service';
import { WorkspaceSeatQuotaService } from '../../../../src/modules/workspace/services/workspace-seat-quota.service';
import { WorkspaceMemberService } from '../../../../src/modules/workspace/services/workspace.member.service';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../../../../src/modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceMemberRepository } from '../../../../src/modules/workspace/repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '../../../../src/modules/workspace/repository/repositories/workspace.repository';

describe('WorkspaceMemberService', () => {
    const mockSeatQuota = {
        assertCanInvite: jest.fn(),
        assertCanAddMember: jest.fn(),
    };
    let service: WorkspaceMemberService;

    const mockEm = {
        getReference: jest.fn((_entity: any, id: any) => ({ id })),
        fork: jest.fn(),
    };
    const mockJwtService = { verify: jest.fn(), sign: jest.fn() };
    const mockConfigService = {
        get: jest.fn((key: string) =>
            key === 'workspace.invitationKey' ? 'secret' : '7d'
        ),
    };
    const mockWorkspaceRepository = {
        findOneById: jest.fn(),
        findOne: jest.fn(),
    };
    const mockWorkspaceMemberRepository = {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
    };
    const mockUserService = { findOneById: jest.fn() };
    const mockRoleService = {
        findOne: jest.fn(),
        isWorkspaceOwnerRole: jest.fn(),
    };
    const mockInvitationService = {
        findOneByToken: jest.fn(),
        accept: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberService,
                { provide: EntityManager, useValue: mockEm },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
                {
                    provide: WorkSpaceRepository,
                    useValue: mockWorkspaceRepository,
                },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: mockWorkspaceMemberRepository,
                },
                { provide: UserService, useValue: mockUserService },
                { provide: RoleService, useValue: mockRoleService },
                { provide: InvitationService, useValue: mockInvitationService },
                { provide: WorkspaceSeatQuotaService, useValue: mockSeatQuota },
            ],
        }).compile();

        service = module.get<WorkspaceMemberService>(WorkspaceMemberService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('verifyInvitationToken', () => {
        it('should return the decoded payload for a valid token', async () => {
            const payload = { workspaceId: 'w', invitedEmail: 'a@b.co' };
            mockJwtService.verify.mockResolvedValue(payload);

            const result = await service.verifyInvitationToken('good-token');

            expect(result).toBe(payload);
            expect(mockJwtService.verify).toHaveBeenCalledWith('good-token', {
                secret: 'secret',
            });
        });

        it('should throw UnauthorizedException for an invalid token', async () => {
            mockJwtService.verify.mockImplementation(() => {
                throw new Error('bad');
            });

            await expect(
                service.verifyInvitationToken('bad-token')
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('assignRoleToMember', () => {
        const workspaceId = randomUUID();
        const userId = randomUUID();
        const roleId = randomUUID();

        beforeEach(() => {
            mockRoleService.findOne.mockResolvedValue({ id: roleId });
            mockUserService.findOneById.mockResolvedValue({ id: userId });
        });

        it('should create a membership when the user does not yet hold the role', async () => {
            mockWorkspaceMemberRepository.find.mockResolvedValue([]);

            await service.assignRoleToMember(workspaceId, userId, roleId);

            expect(mockWorkspaceMemberRepository.create).toHaveBeenCalledTimes(
                1
            );
            const [entity] = mockWorkspaceMemberRepository.create.mock.calls[0];
            expect(entity.isActive).toBe(true);
            expect(entity.role).toEqual({ id: roleId });
            expect(mockSeatQuota.assertCanAddMember).toHaveBeenCalledWith(
                workspaceId
            );
        });

        it('adds no one when the plan has no free seat', async () => {
            mockWorkspaceMemberRepository.find.mockResolvedValue([]);
            const full = new Error('seats');
            mockSeatQuota.assertCanAddMember.mockRejectedValueOnce(full);

            await expect(
                service.assignRoleToMember(workspaceId, userId, roleId)
            ).rejects.toBe(full);
            expect(mockWorkspaceMemberRepository.create).not.toHaveBeenCalled();
        });

        it('takes no new seat when an existing member gets another role', async () => {
            mockWorkspaceMemberRepository.find.mockResolvedValue([
                { role: { id: randomUUID() } },
            ]);

            await service.assignRoleToMember(workspaceId, userId, roleId);

            expect(mockSeatQuota.assertCanAddMember).not.toHaveBeenCalled();
            expect(mockWorkspaceMemberRepository.create).toHaveBeenCalled();
        });

        it('should be a no-op when the user already holds the role', async () => {
            mockWorkspaceMemberRepository.find.mockResolvedValue([
                { role: { id: roleId } },
            ]);

            await service.assignRoleToMember(workspaceId, userId, roleId);

            expect(mockWorkspaceMemberRepository.create).not.toHaveBeenCalled();
        });

        it('should throw when the role is not found in the workspace', async () => {
            mockRoleService.findOne.mockResolvedValue(null);

            await expect(
                service.assignRoleToMember(workspaceId, userId, roleId)
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw when the user is not found', async () => {
            mockUserService.findOneById.mockResolvedValue(null);

            await expect(
                service.assignRoleToMember(workspaceId, userId, roleId)
            ).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('removeRoleFromMember', () => {
        it('should refuse to remove an owner role', async () => {
            mockRoleService.isWorkspaceOwnerRole.mockResolvedValue(true);

            await expect(
                service.removeRoleFromMember('w', 'u', 'owner-role')
            ).rejects.toThrow(UnauthorizedException);
            expect(
                mockWorkspaceMemberRepository.updateMany
            ).not.toHaveBeenCalled();
        });

        it('should deactivate the membership row for a non-owner role', async () => {
            mockRoleService.isWorkspaceOwnerRole.mockResolvedValue(false);
            mockUserService.findOneById.mockResolvedValue({ id: 'u' });

            await service.removeRoleFromMember('w', 'u', 'r');

            expect(
                mockWorkspaceMemberRepository.updateMany
            ).toHaveBeenCalledWith(
                { workspace: 'w', user: 'u', role: 'r', isActive: true },
                { isActive: false }
            );
        });
    });

    describe('acceptInvitation', () => {
        const userId = randomUUID();
        // The invitation row, as the token, id or join-code lookup found it.
        const join = async () =>
            service.acceptInvitation(
                await mockInvitationService.findOneByToken(),
                userId
            );
        const workspaceId = randomUUID();
        const roleId = randomUUID();
        const invitationId = randomUUID();

        beforeEach(() => {
            mockJwtService.verify.mockResolvedValue({ workspaceId, roleId });
            mockWorkspaceRepository.findOneById.mockResolvedValue({
                id: workspaceId,
            });
            // for assignRoleToMember path
            mockRoleService.findOne.mockResolvedValue({ id: roleId });
            mockUserService.findOneById.mockResolvedValue({
                id: userId,
                email: 'invitee@mail.com',
            });
            mockWorkspaceMemberRepository.find.mockResolvedValue([]);
        });

        it('should join, assign role and accept a PENDING, unexpired invitation', async () => {
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60_000),
                inviteeEmail: 'invitee@mail.com',
                workspace: { id: workspaceId },
                role: { id: roleId },
            });

            const result = await join();

            expect(result.workspace).toEqual({ id: workspaceId });
            expect(result.role).toEqual({ id: roleId });
            // The invitation row's role, scoped to its workspace.
            expect(mockRoleService.findOne).toHaveBeenCalledWith(
                { id: roleId, workspace: workspaceId, isActive: true },
                undefined
            );
            expect(mockInvitationService.accept).toHaveBeenCalledWith(
                invitationId,
                userId,
                undefined
            );
        });

        it('grants the built-in Member role (by name, never Admin) when the invitation has none', async () => {
            const memberRoleId = randomUUID();
            mockRoleService.findOne.mockResolvedValue({
                id: memberRoleId,
                name: 'Member',
            });
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60_000),
                inviteeEmail: 'invitee@mail.com',
                workspace: { id: workspaceId },
                role: null,
            });

            const result = await join();

            expect(mockRoleService.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace: workspaceId,
                    name: 'Member',
                    isActive: true,
                }),
                undefined
            );
            expect(result.role).toMatchObject({ id: memberRoleId });
            expect(mockWorkspaceMemberRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ role: { id: memberRoleId } }),
                undefined
            );
        });

        it('refuses a role-less invitation when the Member role is off', async () => {
            mockRoleService.findOne.mockResolvedValue(null);
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60_000),
                inviteeEmail: 'invitee@mail.com',
                workspace: { id: workspaceId },
                role: null,
            });

            await expect(join()).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_WORKSPACE_STATUS_CODE_ERROR.DEFAULT_MEMBER_ROLE_MISSING,
                },
            });
            expect(mockInvitationService.accept).not.toHaveBeenCalled();
        });

        it('refuses when the invited custom role was deleted since', async () => {
            mockRoleService.findOne.mockResolvedValue(null);
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60_000),
                inviteeEmail: 'invitee@mail.com',
                workspace: { id: workspaceId },
                role: { id: roleId },
            });

            await expect(join()).rejects.toThrow(NotFoundException);
            expect(mockWorkspaceMemberRepository.create).not.toHaveBeenCalled();
        });

        it('should reject an already-used invitation', async () => {
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'ACCEPTED',
                expiresAt: new Date(Date.now() + 60_000),
            });

            await expect(join()).rejects.toThrow(UnauthorizedException);
            expect(mockInvitationService.accept).not.toHaveBeenCalled();
        });

        it('should reject an expired invitation', async () => {
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() - 60_000),
            });

            await expect(join()).rejects.toThrow(UnauthorizedException);
        });

        it('should match a mixed-case caller email against the lowercased invitee email', async () => {
            mockUserService.findOneById.mockResolvedValue({
                id: userId,
                email: 'Invitee@Mail.com',
            });
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60_000),
                inviteeEmail: 'invitee@mail.com',
                workspace: { id: workspaceId },
                role: { id: roleId },
            });

            const result = await join();

            expect(result.workspace).toEqual({ id: workspaceId });
            expect(mockInvitationService.accept).toHaveBeenCalledWith(
                invitationId,
                userId,
                undefined
            );
        });

        // 403, not 401: apps/app treats any 401 as an expired session and
        // tries a token refresh, which would bounce a valid user to login.
        it('should reject with 403 when the caller is not the invited user', async () => {
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60_000),
                inviteeEmail: 'someone-else@mail.com',
                workspace: { id: workspaceId },
                role: { id: roleId },
            });

            const result = join();
            await expect(result).rejects.toThrow(ForbiddenException);
            // #184: say the invitation is for another account, not that the
            // link is invalid or expired.
            await expect(result).rejects.toMatchObject({
                response: {
                    statusCode:
                        ENUM_WORKSPACE_STATUS_CODE_ERROR.INVITATION_OTHER_ACCOUNT,
                    message: 'workspace.member.join.otherAccount',
                },
            });
            expect(mockInvitationService.accept).not.toHaveBeenCalled();
        });

        it('keeps the generic message when the caller no longer exists', async () => {
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60_000),
                inviteeEmail: 'someone@mail.com',
                role: { id: roleId },
            });
            mockUserService.findOneById.mockResolvedValue(null);

            await expect(join()).rejects.toMatchObject({
                response: { message: 'workspace.member.join.invalid' },
            });
        });
    });

    describe('getMemberWorkspaceRoles', () => {
        it('should return the roles of the active memberships', async () => {
            const roles = [{ id: 'r1' }, { id: 'r2' }];
            mockWorkspaceMemberRepository.find.mockResolvedValue(
                roles.map(role => ({ role }))
            );

            const result = await service.getMemberWorkspaceRoles('w', 'u');

            expect(result).toEqual(roles);
            expect(mockWorkspaceMemberRepository.find).toHaveBeenCalledWith({
                workspace: 'w',
                user: 'u',
                isActive: true,
            });
        });
    });

    describe('isUserMemberOfWorkspace', () => {
        it('should return true when a membership exists', async () => {
            mockWorkspaceMemberRepository.findOne.mockResolvedValue({
                id: 'm',
            });

            expect(await service.isUserMemberOfWorkspace('w', 'u')).toBe(true);
        });

        it('should return false when no membership exists', async () => {
            mockWorkspaceMemberRepository.findOne.mockResolvedValue(null);

            expect(await service.isUserMemberOfWorkspace('w', 'u')).toBe(false);
        });
    });

    describe('updateRole', () => {
        it('should re-point the membership role and save', async () => {
            const membership: any = { id: 'm', role: { id: 'old' } };
            const role: any = { id: 'new' };
            mockWorkspaceMemberRepository.save.mockResolvedValue(membership);

            await service.updateRole(membership, role);

            expect(mockEm.getReference).toHaveBeenCalled();
            expect(membership.role).toEqual({ id: 'new' });
            expect(mockWorkspaceMemberRepository.save).toHaveBeenCalledWith(
                membership
            );
        });
    });

    describe('delete', () => {
        it('should delete the membership by id', async () => {
            await service.delete({ id: 'm' } as any);

            expect(mockWorkspaceMemberRepository.delete).toHaveBeenCalledWith({
                id: 'm',
            });
        });
    });
});
