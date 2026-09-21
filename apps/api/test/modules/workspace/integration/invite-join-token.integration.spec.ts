import { HelperHashService } from '@app/common/helper/services/helper.hash.service';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import { HelperAvatarService } from '@app/common/helper/services/helper.avatar.service';
import { HelperStringService } from '@app/common/helper/services/helper.string.service';
import { CustomerTagService } from '@app/modules/customer/services/customer-tag.service';
import { InvitationService } from '@app/modules/invitation/services/invitation.service';
import { InvitationRepository } from '@app/modules/invitation/repository/repositories/invitation.repository';
import { KnowledgeBaseService } from '@app/modules/knowledge-base/services/knowledge-base.service';
import { RoleService } from '@app/modules/role/services/role.service';
import { RoleRepository } from '@app/modules/role/repository/repositories/role.repository';
import { UserService } from '@app/modules/user/services/user.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { WorkspaceMemberService } from '@app/modules/workspace/services/workspace.member.service';
import { WorkspaceOwnerService } from '@app/modules/workspace/services/workspace.owner.service';
import { WorkspaceMemberRepository } from '@app/modules/workspace/repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '@app/modules/workspace/repository/repositories/workspace.repository';

// Integration test (no DB, no email): wires the REAL WorkspaceOwnerService,
// WorkspaceMemberService, InvitationService, RoleService and a REAL JwtService
// together, mocking only the persistence layer. It proves the invitation
// "token contract": the token minted on invite is (a) persisted as-is and
// (b) verifiable by the join side — which is exactly what an email would carry.

const INVITATION_SECRET = 'integration-secret';

describe('Invitation token contract (owner ↔ member ↔ invitation)', () => {
    let ownerService: WorkspaceOwnerService;
    let memberService: WorkspaceMemberService;

    const ownerId = randomUUID();
    const workspace = { id: randomUUID(), name: 'Acme' };
    const memberRole = { id: randomUUID() };

    const invitationRepositoryCreate = jest.fn((entity: any) => entity);
    const mockEm = { getReference: jest.fn((_e: any, id: any) => ({ id })) };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [JwtModule.register({})],
            providers: [
                WorkspaceOwnerService,
                {
                    provide: NotificationService,
                    useValue: { createWorkspaceNoPlan: jest.fn() },
                },
                WorkspaceMemberService,
                InvitationService,
                RoleService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) =>
                            key === 'workspace.invitationKey'
                                ? INVITATION_SECRET
                                : '7d'
                        ),
                    },
                },
                { provide: EntityManager, useValue: mockEm },
                {
                    provide: WorkSpaceRepository,
                    useValue: {
                        findOne: jest.fn().mockResolvedValue(workspace),
                        findOneById: jest.fn().mockResolvedValue(workspace),
                    },
                },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: { create: jest.fn() },
                },
                {
                    provide: RoleRepository,
                    useValue: {
                        findOne: jest.fn().mockResolvedValue(memberRole),
                    },
                },
                {
                    provide: InvitationRepository,
                    useValue: {
                        create: invitationRepositoryCreate,
                        findOne: jest.fn().mockResolvedValue(null),
                        getEntityManager: jest.fn(() => mockEm),
                    },
                },
                { provide: UserService, useValue: {} },
                { provide: HelperHashService, useValue: {} },
                HelperAvatarService,
                {
                    provide: HelperStringService,
                    useValue: { random: jest.fn().mockReturnValue('CODE') },
                },
                { provide: KnowledgeBaseService, useValue: {} },
                { provide: CustomerTagService, useValue: {} },
            ],
        }).compile();

        ownerService = module.get(WorkspaceOwnerService);
        memberService = module.get(WorkspaceMemberService);
    });

    afterEach(() => jest.clearAllMocks());

    it('mints a token that is persisted verbatim and verifiable on the join side', async () => {
        const invitedEmail = 'invitee@mail.com';

        const { token, invitationLink } =
            await ownerService.generateInvitationLinkWithDetails(
                ownerId,
                { invitedEmail },
                'https://app.example.com'
            );

        // (a) persisted verbatim — the row's token equals the minted token
        const persisted = invitationRepositoryCreate.mock.calls[0][0];
        expect(persisted.token).toBe(token);
        expect(invitationLink).toContain(token);

        // (b) verifiable on the join side without any email round-trip
        const payload = await memberService.verifyInvitationToken(token);
        expect(payload.workspaceId).toBe(workspace.id);
        expect(payload.invitedEmail).toBe(invitedEmail);
        expect(payload.ownerId).toBe(ownerId);
    });

    it('rejects a token signed with the wrong secret', async () => {
        // A token that did not come from our signer must not verify.
        const forged = [
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
            'eyJ3b3Jrc3BhY2VJZCI6ImZvcmdlZCJ9',
            'not-a-real-signature',
        ].join('.');

        await expect(
            memberService.verifyInvitationToken(forged)
        ).rejects.toThrow(UnauthorizedException);
    });
});
