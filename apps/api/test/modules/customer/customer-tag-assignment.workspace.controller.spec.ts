import { CustomerTagAssignmentWorkspaceController } from '../../../src/modules/customer/controllers/customer-tag-assignment.workspace.controller';

const mockAssignmentService = {
    listByCustomer: jest.fn(),
    apply: jest.fn(),
    remove: jest.fn(),
    mapGet: jest.fn(),
    mapList: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

function buildController(): CustomerTagAssignmentWorkspaceController {
    return new CustomerTagAssignmentWorkspaceController(
        mockAssignmentService as any,
        mockActivityService as any
    );
}

describe('CustomerTagAssignmentWorkspaceController', () => {
    let controller: CustomerTagAssignmentWorkspaceController;

    const workspace = { id: 'ws-1', name: 'Acme' } as any;
    const user = { id: 'user-1', email: 'op@acme.test' } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = buildController();
        mockAssignmentService.mapList.mockImplementation((items: any[]) =>
            items.map(i => ({ id: i.id, tag: i.tag }))
        );
        mockAssignmentService.mapGet.mockImplementation((item: any) => ({
            id: item.id,
            tag: item.tag,
        }));
    });

    describe('GET /:workspace/customers/:customerId/tags', () => {
        it('returns the assignments mapped to DTO for the customer, scoped to this workspace', async () => {
            const assignments = [
                {
                    id: 'assn-1',
                    tag: { id: 'tag-1', name: 'VIP', emoji: '⭐' },
                },
                {
                    id: 'assn-2',
                    tag: { id: 'tag-2', name: 'Hot lead', emoji: '🔥' },
                },
            ];
            mockAssignmentService.listByCustomer.mockResolvedValue(assignments);

            const result = await controller.list(workspace, 'cust-1');

            // BOLA-safe: the service receives both customerId AND workspaceId
            // so cross-workspace customers return [].
            expect(mockAssignmentService.listByCustomer).toHaveBeenCalledWith(
                'cust-1',
                'ws-1'
            );
            expect(mockAssignmentService.mapList).toHaveBeenCalledWith(
                assignments
            );
            expect(result.data).toHaveLength(2);
            expect(result.data[0].tag.name).toBe('VIP');
        });
    });

    describe('POST /:workspace/customers/:customerId/tags/:tagId', () => {
        it('calls service.apply(customerId, tagId, workspaceId) and returns the mapped assignment', async () => {
            const assignment = {
                id: 'assn-1',
                tag: { id: 'tag-1', name: 'VIP' },
            };
            mockAssignmentService.apply.mockResolvedValue(assignment);

            const result = await controller.apply(
                workspace,
                'cust-1',
                'tag-1',
                user
            );

            // BOLA-safe: both ids must resolve within the workspace.
            expect(mockAssignmentService.apply).toHaveBeenCalledWith(
                'cust-1',
                'tag-1',
                'ws-1'
            );
            expect(result.data.id).toBe('assn-1');
        });
    });

    describe('DELETE /:workspace/customers/:customerId/tags/:tagId', () => {
        it('calls service.remove(customerId, tagId, workspaceId) and returns no content', async () => {
            mockAssignmentService.remove.mockResolvedValue(undefined);

            const result = await controller.remove(
                workspace,
                'cust-1',
                'tag-1',
                user
            );

            expect(mockAssignmentService.remove).toHaveBeenCalledWith(
                'cust-1',
                'tag-1',
                'ws-1'
            );
            expect(result).toBeUndefined();
        });
    });
});
