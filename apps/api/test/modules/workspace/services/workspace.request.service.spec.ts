import { NotFoundException } from '@nestjs/common';
import {
    REQUEST_STATUS,
    REQUEST_TYPE,
} from '../../../../src/modules/requests/constant/requests.constant';
import { WorkspaceRequestService } from '../../../../src/modules/workspace/services/workspace.request.service';

// Focused unit test for approve(): a request id must be looked up scoped to
// the workspace it is being approved in. Without the scope, an owner of
// workspace A could approve a join-request that actually targets workspace B
// by guessing/reusing a foreign request id.
describe('WorkspaceRequestService — approve', () => {
    let service: WorkspaceRequestService;

    const mockRequestRepository = {
        findOne: jest.fn(),
        getEntityManager: jest.fn(() => ({ persistAndFlush: jest.fn() })),
    };
    const mockUserService = { findOneById: jest.fn() };
    const mockWorkspaceOwnerService = { addMemberToWorkspace: jest.fn() };
    const mockWorkspaceMemberService = {};
    const mockNotificationService = { create: jest.fn() };
    const mockActivityService = { createByUser: jest.fn() };
    const mockMessageService = { setMessage: jest.fn() };

    const workspace: any = { id: 'ws-1', name: 'Acme', owner: { id: 'own-1' } };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new WorkspaceRequestService(
            mockRequestRepository as any,
            mockUserService as any,
            mockWorkspaceOwnerService as any,
            mockWorkspaceMemberService as any,
            mockNotificationService as any,
            mockActivityService as any,
            mockMessageService as any
        );
    });

    it('looks up the request scoped to the workspace', async () => {
        mockRequestRepository.findOne.mockResolvedValue(null);

        await expect(
            service.approve('req-1', workspace)
        ).rejects.toThrow(NotFoundException);

        expect(mockRequestRepository.findOne).toHaveBeenCalledWith({
            id: 'req-1',
            workspace: workspace.id,
        });
    });

    it('approves a matching JOIN_WORKSPACE request scoped to the workspace', async () => {
        const request: any = {
            id: 'req-1',
            type: REQUEST_TYPE.JOIN_WORKSPACE,
            status: REQUEST_STATUS.PENDING,
            isCancelled: false,
            isApproved: false,
            isRejected: false,
            requestFrom: { id: 'user-1' },
            requestTo: { id: 'own-1' },
        };
        mockRequestRepository.findOne.mockResolvedValue(request);
        mockUserService.findOneById.mockResolvedValue({ id: 'user-1' });

        await service.approve('req-1', workspace);

        expect(mockRequestRepository.findOne).toHaveBeenCalledWith({
            id: 'req-1',
            workspace: workspace.id,
        });
        expect(request.status).toBe(REQUEST_STATUS.APPROVED);
        expect(
            mockWorkspaceOwnerService.addMemberToWorkspace
        ).toHaveBeenCalledWith(workspace.id, 'user-1');
    });
});
