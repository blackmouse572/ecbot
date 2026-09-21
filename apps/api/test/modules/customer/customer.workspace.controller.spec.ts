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

function buildController(): CustomerWorkspaceController {
    return new CustomerWorkspaceController(
        mockCustomerService as any,
        mockMergeSuggestionService as any,
        mockActivityService as any
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
