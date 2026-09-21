import { UnauthorizedException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { RoleService } from '../../../../src/modules/role/services/role.service';
import { UserService } from '../../../../src/modules/user/services/user.service';
import { InvitationService } from '../../../../src/modules/invitation/services/invitation.service';
import { WorkspaceMemberService } from '../../../../src/modules/workspace/services/workspace.member.service';
import { WorkspaceMemberRepository } from '../../../../src/modules/workspace/repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '../../../../src/modules/workspace/repository/repositories/workspace.repository';

describe('WorkspaceMemberService', () => {
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

    describe('joinWorkspaceViaInvitation', () => {
        const userId = randomUUID();
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
            mockUserService.findOneById.mockResolvedValue({ id: userId });
            mockWorkspaceMemberRepository.find.mockResolvedValue([]);
        });

        it('should join, assign role and accept a PENDING, unexpired invitation', async () => {
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60_000),
                role: { id: roleId },
            });

            const result = await service.joinWorkspaceViaInvitation(
                'token',
                userId
            );

            expect(result.workspace).toEqual({ id: workspaceId });
            expect(result.roleId).toBe(roleId);
            expect(mockInvitationService.accept).toHaveBeenCalledWith(
                invitationId,
                userId,
                undefined
            );
        });

        it('should reject an already-used invitation', async () => {
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'ACCEPTED',
                expiresAt: new Date(Date.now() + 60_000),
            });

            await expect(
                service.joinWorkspaceViaInvitation('token', userId)
            ).rejects.toThrow(UnauthorizedException);
            expect(mockInvitationService.accept).not.toHaveBeenCalled();
        });

        it('should reject an expired invitation', async () => {
            mockInvitationService.findOneByToken.mockResolvedValue({
                id: invitationId,
                status: 'PENDING',
                expiresAt: new Date(Date.now() - 60_000),
            });

            await expect(
                service.joinWorkspaceViaInvitation('token', userId)
            ).rejects.toThrow(UnauthorizedException);
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
