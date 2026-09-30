import { NotFoundException } from '@nestjs/common';
import { CustomerWorkspaceController } from '../../../src/modules/customer/controllers/customer.workspace.controller';

// The unit-level test covers the controller's own logic. Cross-workspace tenant
// isolation (returning 404 when looking up a customer from another workspace),
// 401 (no auth), and 403 (no membership) are enforced by the Nest guards
// stacked on the route — @AuthJwtAccessProtected, @WorkspaceMemberOrOwnerProtected,
// @WorkspacePolicyAbilityProtected — and are validated by their respective guard
// specs. An e2e harness would be required to assert the full HTTP contract; that
// is intentionally out of scope for this unit spec.
//
// What we *can* assert here at the unit level:
//   - GET returns the mapped customer
//   - GET throws NotFoundException (-> 404, not 403) when service returns null,
//     which is the tenant-isolation contract: "exists-elsewhere" should look
//     identical to "doesn't exist" to the caller.
//   - PATCH delegates to the service with the body, returns the mapped result
//   - PATCH only sends the editable-field DTO (class-validator strips unknown
//     fields when whitelisting is configured; we verify the controller passes
//     through whatever the framework gave it).

const mockCustomerService = {
    findByWorkspace: jest.fn(),
    countByWorkspace: jest.fn(),
    mapList: jest.fn(),
    findOneById: jest.fn(),
    findOneByIdInWorkspace: jest.fn(),
    update: jest.fn(),
    mapGet: jest.fn(),
};

const mockMergeSuggestionService = {
    unmerge: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn((total: number, limit: number) =>
        Math.ceil(total / limit)
    ),
};

function buildController(): CustomerWorkspaceController {
    return new CustomerWorkspaceController(
        mockCustomerService as any,
        mockMergeSuggestionService as any,
        mockActivityService as any,
        mockPaginationService as any
    );
}

describe('CustomerWorkspaceController', () => {
    let controller: CustomerWorkspaceController;

    const customerEntity = {
        id: 'cust-1',
        name: 'Alice',
        phone: '+84 909',
        email: 'a@b.co',
        language: 'vi',
        notes: 'VIP',
        createdAt: new Date('2026-06-15T00:00:00Z'),
    };
    const mappedDto = {
        id: 'cust-1',
        name: 'Alice',
        phone: '+84 909',
        email: 'a@b.co',
        language: 'vi',
        notes: 'VIP',
        createdAt: customerEntity.createdAt,
    };
    const user = { id: 'user-1', email: 'op@acme.test' } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = buildController();
        mockCustomerService.mapGet.mockReturnValue(mappedDto);
    });

    describe('GET /:workspace/customers', () => {
        it('lists the workspace customers a page at a time, with the search', async () => {
            mockCustomerService.findByWorkspace.mockResolvedValue([
                customerEntity,
            ]);
            mockCustomerService.countByWorkspace.mockResolvedValue(45);
            mockCustomerService.mapList.mockReturnValue([mappedDto]);
            const search = { $or: [{ name: { $ilike: '%ali%' } }] };

            const result = await controller.list(
                { id: 'ws-1' } as any,
                {
                    _search: search,
                    _limit: 20,
                    _offset: 20,
                    _order: { createdAt: 'desc' },
                } as any
            );

            expect(mockCustomerService.findByWorkspace).toHaveBeenCalledWith(
                'ws-1',
                search,
                {
                    paging: { limit: 20, offset: 20 },
                    // id breaks ties, so rows with the same createdAt keep
                    // their place from page to page.
                    order: { createdAt: 'desc', id: 'DESC' },
                }
            );
            expect(mockCustomerService.countByWorkspace).toHaveBeenCalledWith(
                'ws-1',
                search
            );
            expect(result).toEqual({
                _pagination: { total: 45, totalPage: 3 },
                data: [mappedDto],
            });
        });
    });

    describe('GET /:workspace/customers/:id', () => {
        it('returns the mapped customer DTO when found in the workspace', async () => {
            mockCustomerService.findOneByIdInWorkspace.mockResolvedValue(
                customerEntity
            );

            const result = await controller.get(
                { id: 'ws-1' } as any,
                'cust-1'
            );

            // BOLA-safe lookup: service is asked for (id, workspaceId), never id alone.
            expect(
                mockCustomerService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith('cust-1', 'ws-1');
            expect(mockCustomerService.mapGet).toHaveBeenCalledWith(
                customerEntity
            );
            expect(result).toEqual({ data: mappedDto });
        });

        it('throws NotFoundException (not 403) when the customer does not exist in this workspace — collapses missing + cross-workspace into one 404', async () => {
            mockCustomerService.findOneByIdInWorkspace.mockResolvedValue(null);

            await expect(
                controller.get({ id: 'ws-1' } as any, 'cust-from-other-ws')
            ).rejects.toBeInstanceOf(NotFoundException);
            // The mapper must NOT be called when the workspace-scoped lookup
            // returns nothing — that's how cross-workspace access is silenced.
            expect(mockCustomerService.mapGet).not.toHaveBeenCalled();
        });
    });

    describe('PATCH /:workspace/customers/:id', () => {
        it('forwards the editable fields to the service and returns the mapped result', async () => {
            const dto = {
                name: 'New Name',
                phone: '+84 1234',
                email: 'new@example.com',
                language: 'en',
                notes: 'Updated notes',
            };
            const updated = { ...customerEntity, ...dto };
            mockCustomerService.update.mockResolvedValue(updated);
            mockCustomerService.mapGet.mockReturnValue({
                ...mappedDto,
                ...dto,
            });

            const result = await controller.update(
                { id: 'ws-1' } as any,
                'cust-1',
                dto as any,
                user
            );

            // BOLA-safe: workspaceId is passed through so the service can
            // refuse to patch a customer that lives elsewhere.
            expect(mockCustomerService.update).toHaveBeenCalledWith(
                'cust-1',
                dto,
                'ws-1'
            );
            expect(result.data.name).toBe('New Name');
            expect(result.data.email).toBe('new@example.com');
        });

        it('propagates NotFoundException from the service when target customer is gone', async () => {
            mockCustomerService.update.mockRejectedValue(
                new NotFoundException({
                    message: 'customer.error.notFound',
                    statusCode: 404,
                })
            );

            await expect(
                controller.update(
                    { id: 'ws-1' } as any,
                    'cust-missing',
                    { name: 'x' } as any,
                    user
                )
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('passes only the DTO it received — the DTO whitelist enforced by class-validator drops unknown fields before the controller sees them', async () => {
            // We can't simulate the global ValidationPipe here, but we can
            // assert the controller is a thin pass-through that doesn't add
            // or strip fields itself. That's the unit-level invariant.
            const dto = { name: 'A' };
            mockCustomerService.update.mockResolvedValue({
                ...customerEntity,
                ...dto,
            });

            await controller.update(
                { id: 'ws-1' } as any,
                'cust-1',
                dto as any,
                user
            );

            expect(mockCustomerService.update).toHaveBeenCalledWith(
                'cust-1',
                dto,
                'ws-1'
            );
            // Exactly one positional arg shape — no mutation of the patch body:
            const [, patch] = mockCustomerService.update.mock.calls[0];
            expect(Object.keys(patch)).toEqual(['name']);
        });
    });
});
