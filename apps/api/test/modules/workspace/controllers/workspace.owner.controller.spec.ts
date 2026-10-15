// Provide a complete workspace-decorator stub (the global setup only stubs a
// subset) so importing the controller does not fail at decoration time.
jest.mock('@app/modules/workspace/decorators/workspace.decorator', () => ({
    WorkspaceOwnerProtected: () => () => {},
    WorkspaceMemberOrOwnerProtected: () => () => {},
    WorkspacePolicyAbilityProtected: () => () => {},
    WorkspacePayload: () => () => {},
}));

import { randomUUID } from 'crypto';
import { ENUM_ACTIVITY_ACTION } from '../../../../src/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from '../../../../src/modules/policy/enums/policy.enum';
import { WorkspaceController } from '../../../../src/modules/workspace/controllers/workspace.owner.controller';

// Unit tests for the controller's invite-link construction. The invitation
// link used to be built from the request's Origin header (@GetClientOrigin),
// which lets a caller point the emailed link at an attacker-controlled host.
// It must instead come from configured `home.url`.

describe('WorkspaceController — inviteMemberToWorkSpace', () => {
    let controller: WorkspaceController;

    const mockUserService = {
        findOneById: jest.fn(),
        findOneByEmail: jest.fn(),
        mapProfile: jest.fn(),
    };
    const mockWorkSpaceService = {
        generateInvitationLinkWithDetails: jest.fn(),
        checkUserIsOwner: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        mapGet: jest.fn(),
    };
    const mockWorkspaceMemberService = { findOne: jest.fn(), join: jest.fn() };
    const mockPaginationService = { totalPage: jest.fn() };
    const mockEmailService = { sendInvitationToWorkSpace: jest.fn() };
    const mockActivityService = { createByUserWithWorkspace: jest.fn() };
    const mockNotificationService = { createWorkspaceInvitation: jest.fn() };
    const mockAwsS3Service = { putItem: jest.fn() };
    const mockConfigService = {
        get: jest.fn((key: string) =>
            key === 'home.url' ? 'https://ecbot.example.com' : undefined
        ),
    };

    const workspace = { id: randomUUID(), name: 'Acme' } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new WorkspaceController(
            mockUserService as any,
            mockWorkSpaceService as any,
            mockWorkspaceMemberService as any,
            mockPaginationService as any,
            mockEmailService as any,
            mockActivityService as any,
            mockNotificationService as any,
            mockAwsS3Service as any,
            mockConfigService as any
        );
        mockWorkSpaceService.generateInvitationLinkWithDetails.mockResolvedValue(
            {
                invitationLink:
                    'https://ecbot.example.com/join?tokens=signed-jwt',
                expiresAt: new Date('2026-10-01T00:00:00Z'),
                invitationId: 'invitation-1',
            }
        );
        mockUserService.findOneByEmail.mockResolvedValue(null);
    });

    // Ids only: the audit log is append-only, so the invitee email stays out.
    it('logs INVITE_MEMBER as the inviter, with the invitation id', async () => {
        const inviter = { id: 'owner-1', name: 'Chi' };
        mockUserService.findOneById.mockResolvedValue(inviter);

        await controller.inviteMemberToWorkSpace(
            'owner-1',
            { invitedEmail: 'invitee@mail.com' } as any,
            workspace
        );

        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(inviter, workspace, {
            action: ENUM_ACTIVITY_ACTION.INVITE_MEMBER,
            subject: ENUM_POLICY_SUBJECT.INVITATION,
            metadata: { id: 'invitation-1' },
        });
    });

    // A failed audit write must not 500 an invitation that was already
    // emailed: the entry is written before the mail goes out.
    it('logs the invitation before emailing it', async () => {
        mockUserService.findOneById.mockResolvedValue({ id: 'owner-1' });

        await controller.inviteMemberToWorkSpace(
            'owner-1',
            { invitedEmail: 'invitee@mail.com' } as any,
            workspace
        );

        expect(
            mockActivityService.createByUserWithWorkspace.mock
                .invocationCallOrder[0]
        ).toBeLessThan(
            mockEmailService.sendInvitationToWorkSpace.mock
                .invocationCallOrder[0]
        );
    });

    it('builds the invitation link from configured home.url, not the Origin header', async () => {
        await controller.inviteMemberToWorkSpace(
            'owner-1',
            { invitedEmail: 'invitee@mail.com' } as any,
            workspace
        );

        expect(
            mockWorkSpaceService.generateInvitationLinkWithDetails
        ).toHaveBeenCalledWith(
            'owner-1',
            { invitedEmail: 'invitee@mail.com' },
            'https://ecbot.example.com',
            workspace
        );
    });

    it('targets the guard-resolved (URL) workspace for a non-owner caller with invite permission', async () => {
        // The WorkspacePolicyAbilityProtected({MEMBER: CREATE}) guard already
        // authorized this caller against `workspace` — the controller must
        // not re-derive or second-guess the target from the caller's own
        // owned workspaces; it always passes through the URL workspace.
        const nonOwnerCallerId = 'admin-not-owner';

        await controller.inviteMemberToWorkSpace(
            nonOwnerCallerId,
            { invitedEmail: 'invitee@mail.com' } as any,
            workspace
        );

        expect(
            mockWorkSpaceService.generateInvitationLinkWithDetails
        ).toHaveBeenCalledWith(
            nonOwnerCallerId,
            { invitedEmail: 'invitee@mail.com' },
            'https://ecbot.example.com',
            workspace
        );
    });

    // #185: the email named neither the workspace nor the inviter and was
    // English-only, whatever language the inviter uses.
    it('emails the invitee who invited them, to which workspace, in the inviter language', async () => {
        mockUserService.findOneById.mockResolvedValue({
            id: 'owner-1',
            name: 'Chi Nguyen',
        });

        await controller.inviteMemberToWorkSpace(
            'owner-1',
            { invitedEmail: 'invitee@mail.com' } as any,
            workspace,
            { __language: 'vi' } as any
        );

        expect(mockEmailService.sendInvitationToWorkSpace).toHaveBeenCalledWith(
            { email: 'invitee@mail.com', name: '' },
            {
                invitationLink:
                    'https://ecbot.example.com/join?tokens=signed-jwt',
                workspaceName: 'Acme',
                inviterName: 'Chi Nguyen',
                expiresAt: new Date('2026-10-01T00:00:00Z'),
                language: 'vi',
            }
        );
    });

    // #247 review: an empty name gave "Acme invited you to Acme".
    it('names the inviter by email when they have no name', async () => {
        mockUserService.findOneById.mockResolvedValue({
            id: 'owner-1',
            name: '',
            email: 'chi@kunmart.vn',
        });

        await controller.inviteMemberToWorkSpace(
            'owner-1',
            { invitedEmail: 'invitee@mail.com' } as any,
            workspace
        );

        expect(
            mockEmailService.sendInvitationToWorkSpace.mock.calls[0][1]
                .inviterName
        ).toBe('chi@kunmart.vn');
    });

    it('caps invitations per minute, since each one sends an email', () => {
        const handler = WorkspaceController.prototype.inviteMemberToWorkSpace;

        expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(10);
        expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(
            60000
        );
    });
});

// Task 14: the workspace avatar upload keyed objects as
// `workspace/avatar/${userId}_${Date.now()}_${image.originalname}`, letting
// the client-controlled `originalname` land unsanitized in the S3 key.
describe('WorkspaceController — avatar upload key shape (Task 14)', () => {
    let controller: WorkspaceController;

    const mockUserService = {
        findOneById: jest.fn(),
        findOneByEmail: jest.fn(),
        mapProfile: jest.fn(),
    };
    const mockWorkSpaceService = {
        generateInvitationLinkWithDetails: jest.fn(),
        checkUserIsOwner: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        mapGet: jest.fn(),
    };
    const mockWorkspaceMemberService = { findOne: jest.fn(), join: jest.fn() };
    const mockPaginationService = { totalPage: jest.fn() };
    const mockEmailService = { sendInvitationToWorkSpace: jest.fn() };
    const mockActivityService = { createByUserWithWorkspace: jest.fn() };
    const mockNotificationService = { createWorkspaceInvitation: jest.fn() };
    const mockAwsS3Service = { putItem: jest.fn() };
    const mockConfigService = {
        get: jest.fn((key: string) =>
            key === 'home.url' ? 'https://ecbot.example.com' : undefined
        ),
    };

    const image = {
        originalname: '../../evil name with spaces.exe.png',
        mimetype: 'image/png',
        buffer: Buffer.from('fake'),
        size: 4,
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new WorkspaceController(
            mockUserService as any,
            mockWorkSpaceService as any,
            mockWorkspaceMemberService as any,
            mockPaginationService as any,
            mockEmailService as any,
            mockActivityService as any,
            mockNotificationService as any,
            mockAwsS3Service as any,
            mockConfigService as any
        );
        mockUserService.findOneById.mockResolvedValue({ id: 'owner-1' });
        mockAwsS3Service.putItem.mockResolvedValue({
            completedUrl: 'https://cdn.example.com/avatar.png',
        });
        mockWorkSpaceService.create.mockResolvedValue({ id: 'ws-1' });
        mockWorkSpaceService.mapGet.mockReturnValue({ id: 'ws-1' });
    });

    it('createWorkSpace keys the upload under workspace/{id}/<uuid>.<ext>, never the raw originalname', async () => {
        await controller.createWorkSpace(
            'owner-1',
            { name: 'Acme' } as any,
            image
        );

        expect(mockAwsS3Service.putItem).toHaveBeenCalledTimes(1);
        const call = mockAwsS3Service.putItem.mock.calls[0][0];

        expect(call.key).toMatch(/^workspace\/owner-1\/[0-9a-f-]{36}\.png$/);
        expect(call.key).not.toContain('evil');
    });

    it('createWorkSpace passes the request language on, so default tags match it', async () => {
        await controller.createWorkSpace(
            'owner-1',
            { name: 'Acme' } as any,
            undefined,
            'vi'
        );

        expect(mockWorkSpaceService.create).toHaveBeenCalledWith(
            { id: 'owner-1' },
            { name: 'Acme', image: undefined },
            undefined,
            'vi'
        );
    });

    it('createWorkSpace still creates the workspace, with the default avatar, when the optional avatar upload fails', async () => {
        mockAwsS3Service.putItem.mockRejectedValueOnce(
            new Error('AccessDenied')
        );

        const result = await controller.createWorkSpace(
            'owner-1',
            { name: 'Acme' } as any,
            image
        );

        // No image: the service seeds its default avatar.
        expect(mockWorkSpaceService.create).toHaveBeenCalledWith(
            { id: 'owner-1' },
            { name: 'Acme', image: undefined },
            undefined,
            undefined
        );
        expect(result).toEqual({ data: { id: 'ws-1' } });
    });

    it('updateWorkSpace keys the upload under workspace/{id}/<uuid>.<ext>, never the raw originalname', async () => {
        const workspace = { id: 'ws-1', owner: { id: 'owner-1' } } as any;

        await controller.updateWorkSpace(
            'owner-1',
            { name: 'Acme' } as any,
            workspace,
            image
        );

        expect(mockAwsS3Service.putItem).toHaveBeenCalledTimes(1);
        const call = mockAwsS3Service.putItem.mock.calls[0][0];

        expect(call.key).toMatch(/^workspace\/owner-1\/[0-9a-f-]{36}\.png$/);
        expect(call.key).not.toContain('evil');
    });
});
