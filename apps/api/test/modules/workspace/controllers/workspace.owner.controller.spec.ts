// Provide a complete workspace-decorator stub (the global setup only stubs a
// subset) so importing the controller does not fail at decoration time.
jest.mock('@app/modules/workspace/decorators/workspace.decorator', () => ({
    WorkspaceOwnerProtected: () => () => {},
    WorkspaceMemberOrOwnerProtected: () => () => {},
    WorkspacePolicyAbilityProtected: () => () => {},
    WorkspacePayload: () => () => {},
}));

import { randomUUID } from 'crypto';
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
            }
        );
        mockUserService.findOneByEmail.mockResolvedValue(null);
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

        expect(call.key).toMatch(
            /^workspace\/owner-1\/[0-9a-f-]{36}\.png$/
        );
        expect(call.key).not.toContain('evil');
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

        expect(call.key).toMatch(
            /^workspace\/owner-1\/[0-9a-f-]{36}\.png$/
        );
        expect(call.key).not.toContain('evil');
    });
});
