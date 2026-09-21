import { CustomerMergeSuggestionWorkspaceController } from '../../../src/modules/customer/controllers/customer-merge-suggestion.workspace.controller';
import { ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS } from '../../../src/modules/customer/enums/customer.enum';

// Unit-level controller spec. The controller is a thin pass-through to
// CustomerMergeSuggestionService — we assert the delegations + the workspace
// scoping. Tenant isolation, auth, and policy guards are validated separately
// at the guard level.

const mockSuggestionService = {
    listByWorkspace: jest.fn(),
    findPendingCustomerIdsByWorkspace: jest.fn(),
    findOne: jest.fn(),
    confirmMerge: jest.fn(),
    dismiss: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

function buildController(): CustomerMergeSuggestionWorkspaceController {
    return new CustomerMergeSuggestionWorkspaceController(
        mockSuggestionService as any,
        mockActivityService as any
    );
}

describe('CustomerMergeSuggestionWorkspaceController', () => {
    let controller: CustomerMergeSuggestionWorkspaceController;

    const workspace = { id: 'ws-1' } as any;
    const user = { id: 'user-1', email: 'op@acme.test' } as any;
    const baseSuggestion = {
        id: 'sugg-1',
        status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
        matchField: 'phone',
        matchValue: '0901',
        customerA: { id: 'cust-A', name: 'A', createdAt: new Date() },
        customerB: { id: 'cust-B', name: 'B', createdAt: new Date() },
        createdAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = buildController();
    });

    describe('GET /customer-merge-suggestions', () => {
        it('delegates to listByWorkspace with status + pagination from the query', async () => {
            mockSuggestionService.listByWorkspace.mockResolvedValue({
                data: [baseSuggestion],
                page: 2,
                perPage: 10,
                totalData: 1,
            });

            const result = await controller.list(
                workspace,
                ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
                2,
                10
            );

            expect(mockSuggestionService.listByWorkspace).toHaveBeenCalledWith(
                'ws-1',
                {
                    status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
                    page: 2,
                    perPage: 10,
                }
            );
            expect(result.data.data).toHaveLength(1);
            expect(result.data.page).toBe(2);
            expect(result.data.perPage).toBe(10);
            expect(result.data.totalData).toBe(1);
        });

        it('passes undefined status when the query omits it (service defaults to PENDING)', async () => {
            mockSuggestionService.listByWorkspace.mockResolvedValue({
                data: [],
                page: 1,
                perPage: 20,
                totalData: 0,
            });

            await controller.list(workspace, undefined, 1, 20);

            const [, params] =
                mockSuggestionService.listByWorkspace.mock.calls[0];
            expect(params.status).toBeUndefined();
        });
    });

    describe('GET /customer-merge-suggestions/pending-customer-ids', () => {
        it('returns the Set of pending customer ids as a list', async () => {
            mockSuggestionService.findPendingCustomerIdsByWorkspace.mockResolvedValue(
                ['cust-A', 'cust-B', 'cust-C']
            );

            const result = await controller.pendingCustomerIds(workspace);

            expect(
                mockSuggestionService.findPendingCustomerIdsByWorkspace
            ).toHaveBeenCalledWith('ws-1');
            expect(result.data.customerIds).toEqual([
                'cust-A',
                'cust-B',
                'cust-C',
            ]);
        });

        it('returns an empty list when no pending suggestions exist', async () => {
            mockSuggestionService.findPendingCustomerIdsByWorkspace.mockResolvedValue(
                []
            );
            const result = await controller.pendingCustomerIds(workspace);
            expect(result.data.customerIds).toEqual([]);
        });
    });

    describe('POST /customer-merge-suggestions/:id/confirm', () => {
        it('delegates to confirmMerge with the id + body', async () => {
            mockSuggestionService.confirmMerge.mockResolvedValue({
                survivorId: 'cust-A',
                loserId: 'cust-B',
            });

            const dto = {
                survivorId: 'cust-A',
                fieldResolutions: { name: 'A', phone: 'B' },
            };
            const result = await controller.confirm(
                workspace,
                'sugg-1',
                dto as any,
                user
            );

            expect(mockSuggestionService.confirmMerge).toHaveBeenCalledWith(
                'sugg-1',
                'ws-1',
                {
                    survivorId: 'cust-A',
                    fieldResolutions: { name: 'A', phone: 'B' },
                }
            );
            expect(result.data).toEqual({
                survivorId: 'cust-A',
                loserId: 'cust-B',
            });
        });
    });

    describe('POST /customer-merge-suggestions/:id/dismiss', () => {
        it('delegates to dismiss with the suggestion id', async () => {
            mockSuggestionService.dismiss.mockResolvedValue({
                ...baseSuggestion,
                status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.DISMISSED,
            });

            const result = await controller.dismiss(workspace, 'sugg-1', user);

            expect(mockSuggestionService.dismiss).toHaveBeenCalledWith(
                'sugg-1',
                'ws-1'
            );
            expect(result.data).toBeDefined();
        });
    });

    describe('GET /customer-merge-suggestions/:id', () => {
        it('returns the suggestion DTO', async () => {
            mockSuggestionService.findOne.mockResolvedValue(baseSuggestion);

            const result = await controller.get(workspace, 'sugg-1');

            expect(mockSuggestionService.findOne).toHaveBeenCalledWith(
                'sugg-1',
                'ws-1'
            );
            expect(result.data).toBeDefined();
        });
    });
});
