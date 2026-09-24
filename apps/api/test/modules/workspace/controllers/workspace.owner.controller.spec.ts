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
