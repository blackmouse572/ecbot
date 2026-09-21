// Provide a complete workspace-decorator stub (global setup stubs only a subset)
// so importing the controller does not fail at decoration time.
jest.mock('@app/modules/workspace/decorators/workspace.decorator', () => ({
    WorkspaceOwnerProtected: () => () => {},
    WorkspaceMemberOrOwnerProtected: () => () => {},
    WorkspacePolicyAbilityProtected: () => () => {},
    WorkspacePayload: () => () => {},
}));

import { randomUUID } from 'crypto';
import { RequestController } from '../../../src/modules/requests/controllers/requests.controller';

describe('RequestController', () => {
    let controller: RequestController;

    const mockRequestService = {
        findByWorkspace: jest.fn(),
        getTotalByWorkspace: jest.fn(),
        mapList: jest.fn(),
        create: jest.fn(),
        approve: jest.fn(),
    };
    const mockUserService = { findOneById: jest.fn() };

    const workspace = { id: randomUUID() } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new RequestController(
            mockRequestService as any,
            mockUserService as any
        );
    });

    describe('getRequests', () => {
        it('returns the mapped list with pagination meta', async () => {
            const entities = [{ id: 'r1' }, { id: 'r2' }];
            const mapped = [{ id: 'r1' }, { id: 'r2' }] as any;
            mockRequestService.findByWorkspace.mockResolvedValue(entities);
            mockRequestService.getTotalByWorkspace.mockResolvedValue(2);
            mockRequestService.mapList.mockReturnValue(mapped);

            const result = await controller.getRequests(workspace);

            expect(mockRequestService.findByWorkspace).toHaveBeenCalledWith(
                workspace
            );
            expect(mockRequestService.getTotalByWorkspace).toHaveBeenCalledWith(
                workspace
            );
            expect(mockRequestService.mapList).toHaveBeenCalledWith(entities);
            expect(result).toEqual({
                _pagination: { total: 2, totalPage: 1 },
                data: mapped,
            });
        });

        it('returns an empty page when the workspace has no pending requests', async () => {
            mockRequestService.findByWorkspace.mockResolvedValue([]);
            mockRequestService.getTotalByWorkspace.mockResolvedValue(0);
            mockRequestService.mapList.mockReturnValue([]);

            const result = await controller.getRequests(workspace);

            expect(result).toEqual({
                _pagination: { total: 0, totalPage: 1 },
                data: [],
            });
        });
    });
});
