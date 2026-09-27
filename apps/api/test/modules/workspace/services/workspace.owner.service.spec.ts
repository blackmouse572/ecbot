import { HelperHashService } from '@app/common/helper/services/helper.hash.service';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import { HelperAvatarService } from '@app/common/helper/services/helper.avatar.service';
import { HelperStringService } from '@app/common/helper/services/helper.string.service';
import { InvitationService } from '@app/modules/invitation/services/invitation.service';
import { KnowledgeBaseService } from '@app/modules/knowledge-base/services/knowledge-base.service';
import { CustomerTagService } from '@app/modules/customer/services/customer-tag.service';
import { RoleService } from '@app/modules/role/services/role.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { WorkspaceMemberService } from '../../../../src/modules/workspace/services/workspace.member.service';
import { WorkspaceOwnerService } from '../../../../src/modules/workspace/services/workspace.owner.service';
import { WorkspaceMemberRepository } from '../../../../src/modules/workspace/repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '../../../../src/modules/workspace/repository/repositories/workspace.repository';

describe('WorkspaceOwnerService', () => {
    let service: WorkspaceOwnerService;

    const ownerId = randomUUID();
    const workspace = { id: randomUUID(), name: 'Acme' };
    const url = 'https://app.example.com';

    const mockWorkspaceRepository = { findOne: jest.fn(), getTotal: jest.fn() };
    const mockWorkspaceMemberRepository = { create: jest.fn() };
    const mockConfigService = {
        get: jest.fn((key: string) =>
            key === 'workspace.invitationKey' ? 'secret' : '7d'
        ),
    };
    const mockJwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
    const mockRoleService = {
        findOne: jest.fn(),
        isWorkspaceOwnerRole: jest.fn(),
    };
    const mockInvitationService = {
        checkExistingInvitation: jest.fn(),
        create: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceOwnerService,
                {
                    provide: NotificationService,
                    useValue: { createWorkspaceNoPlan: jest.fn() },
                },
                { provide: EntityManager, useValue: {} },
                {
                    provide: WorkSpaceRepository,
                    useValue: mockWorkspaceRepository,
                },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: mockWorkspaceMemberRepository,
                },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: HelperHashService, useValue: {} },
                HelperAvatarService,
                { provide: JwtService, useValue: mockJwtService },
                {
                    provide: HelperStringService,
                    useValue: { random: jest.fn().mockReturnValue('CODE') },
                },
                { provide: WorkspaceMemberService, useValue: {} },
                { provide: RoleService, useValue: mockRoleService },
                { provide: InvitationService, useValue: mockInvitationService },
                { provide: KnowledgeBaseService, useValue: {} },
                { provide: CustomerTagService, useValue: {} },
            ],
        }).compile();

        service = module.get<WorkspaceOwnerService>(WorkspaceOwnerService);
        mockWorkspaceRepository.findOne.mockResolvedValue(workspace);
    });

    afterEach(() => {
        jest.clearAllMocks();
        mockJwtService.sign.mockReturnValue('signed-jwt');
        mockInvitationService.create.mockResolvedValue(undefined);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateInvitationLinkWithDetails', () => {
        it('should sign an HS256 JWT, persist the invitation and return the token/link', async () => {
            mockInvitationService.checkExistingInvitation.mockResolvedValue(
                null
            );
            mockRoleService.findOne.mockResolvedValue({ id: 'member-role' });

            const result = await service.generateInvitationLinkWithDetails(
                ownerId,
                { invitedEmail: 'invitee@mail.com' },
                url,
                workspace as any
            );

            expect(mockJwtService.sign).toHaveBeenCalledWith(
                expect.objectContaining({
                    ownerId,
                    workspaceId: workspace.id,
                    invitedEmail: 'invitee@mail.com',
                }),
                expect.objectContaining({
                    privateKey: 'secret',
                    algorithm: 'HS256',
                })
            );
            expect(result.token).toBe('signed-jwt');
            expect(result.invitationLink).toBe(`${url}/join?tokens=signed-jwt`);
            expect(result.workspaceId).toBe(workspace.id);
            expect(mockInvitationService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace: workspace.id,
                    user: ownerId,
                    email: 'invitee@mail.com',
                    token: 'signed-jwt',
                })
            );
        });

        it('should be idempotent — return an existing PENDING invitation without re-signing', async () => {
            mockInvitationService.checkExistingInvitation.mockResolvedValue({
                token: 'existing-token',
                invitationLink: `${url}/join?tokens=existing-token`,
                expiresAt: new Date('2026-08-30T00:00:00Z'),
            });

            const result = await service.generateInvitationLinkWithDetails(
                ownerId,
                { invitedEmail: 'invitee@mail.com' },
                url,
                workspace as any
            );

            expect(result.token).toBe('existing-token');
            expect(mockJwtService.sign).not.toHaveBeenCalled();
            expect(mockInvitationService.create).not.toHaveBeenCalled();
        });

        it('should rebuild the idempotent link from the configured url + stored token, never the stored invitationLink column', async () => {
            // A pre-fix row (or any row with a bad/foreign stored link) must
            // not be trusted and re-emailed as-is.
            mockInvitationService.checkExistingInvitation.mockResolvedValue({
                token: 'existing-token',
                invitationLink:
                    'https://attacker.example.com/join?tokens=existing-token',
                expiresAt: new Date('2026-08-30T00:00:00Z'),
            });

            const result = await service.generateInvitationLinkWithDetails(
                ownerId,
                { invitedEmail: 'invitee@mail.com' },
                url,
                workspace as any
            );

            expect(result.invitationLink).toBe(
                `${url}/join?tokens=existing-token`
            );
            expect(result.invitationLink.startsWith(url)).toBe(true);
        });

        it('should throw when the provided roleId does not belong to the workspace', async () => {
            mockInvitationService.checkExistingInvitation.mockResolvedValue(
                null
            );
            mockRoleService.findOne.mockResolvedValue(null);

            await expect(
                service.generateInvitationLinkWithDetails(
                    ownerId,
                    { invitedEmail: 'invitee@mail.com', roleId: 'ghost' },
                    url,
                    workspace as any
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('should reject inviting a member as an owner role', async () => {
            mockInvitationService.checkExistingInvitation.mockResolvedValue(
                null
            );
            mockRoleService.findOne.mockResolvedValue({ id: 'owner-role' });
            mockRoleService.isWorkspaceOwnerRole.mockResolvedValue(true);

            await expect(
                service.generateInvitationLinkWithDetails(
                    ownerId,
                    { invitedEmail: 'invitee@mail.com', roleId: 'owner-role' },
                    url,
                    workspace as any
                )
            ).rejects.toThrow(NotFoundException);
        });

        it('should fall back to the default WORKSPACE_MEMBER role when no roleId is given', async () => {
            mockInvitationService.checkExistingInvitation.mockResolvedValue(
                null
            );
            mockRoleService.findOne.mockResolvedValue({ id: 'default-member' });

            await service.generateInvitationLinkWithDetails(
                ownerId,
                { invitedEmail: 'invitee@mail.com' },
                url,
                workspace as any
            );

            expect(mockRoleService.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspace: workspace.id,
                    isActive: true,
                    type: expect.anything(),
                })
            );
            expect(mockInvitationService.create).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'default-member' })
            );
        });

        it('never re-looks-up the workspace by owner — the passed-in workspace is always the target, even for a caller who does not own it', async () => {
            mockInvitationService.checkExistingInvitation.mockResolvedValue(
                null
            );
            mockRoleService.findOne.mockResolvedValue({ id: 'default-member' });
            // A caller id with no relation to `workspace` at all (not its
            // owner) — the guard already authorized them; the service must
            // not re-derive or gate the target based on ownership.
            const nonOwnerCallerId = randomUUID();

            const result = await service.generateInvitationLinkWithDetails(
                nonOwnerCallerId,
                { invitedEmail: 'invitee@mail.com' },
                url,
                workspace as any
            );

            expect(result.workspaceId).toBe(workspace.id);
            // No owner-scoped (or any) workspace repository lookup happens
            // in this flow anymore.
            expect(mockWorkspaceRepository.findOne).not.toHaveBeenCalled();
        });
    });

    describe('parseExpiration', () => {
        it.each([
            ['7d', 7 * 24 * 60 * 60 * 1000],
            ['24h', 24 * 60 * 60 * 1000],
            ['30m', 30 * 60 * 1000],
            ['garbage', 24 * 60 * 60 * 1000],
        ])('parses %s', (input, expected) => {
            expect((service as any).parseExpiration(input)).toBe(expected);
        });
    });
});
