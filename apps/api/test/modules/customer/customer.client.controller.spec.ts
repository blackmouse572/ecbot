import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '../../../src/common/pagination/enums/pagination.enum';
import { CustomerClientController } from '../../../src/modules/customer/controllers/customer.client.controller';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';

// /client surface: scoped to the credential's workspace, and reading a
// customer is logged as a view by the credential's creator, as the
// workspace route logs it for the signed-in operator.

const mockCustomerService = {
    findByWorkspace: jest.fn(),
    countByWorkspace: jest.fn(),
    mapList: jest.fn(),
    findOneByIdInWorkspace: jest.fn(),
    mapGet: jest.fn(),
    update: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn((total: number, limit: number) =>
        Math.ceil(total / limit)
    ),
};

describe('CustomerClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;
    let controller: CustomerClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new CustomerClientController(
            mockCustomerService as any,
            mockActivityService as any,
            mockPaginationService as any
        );
    });

    it('is mounted at /customers', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, CustomerClientController)
        ).toBe('/customers');
    });

    it.each(['list', 'get'] as const)(
        '%s is guarded by the client credential and the creator policy',
        handler => {
            expect(
                Reflect.getMetadata(
                    GUARDS_METADATA,
                    CustomerClientController.prototype[handler]
                )
            ).toEqual([ClientCredentialGuard, ClientCredentialPolicyGuard]);
        }
    );

    // Same ability as the matching workspace route: the key can do no more
    // than its creator.
    it.each(['list', 'get'] as const)('%s requires CUSTOMER read', handler => {
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                CustomerClientController.prototype[handler]
            )
        ).toEqual([
            {
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                action: [ENUM_POLICY_ACTION.READ],
            },
        ]);
    });

    it('lists the credential workspace customers, newest first with a stable tiebreak', async () => {
        const mapped = [{ id: 'cust-1', name: 'Alice' }];
        mockCustomerService.findByWorkspace.mockResolvedValue([
            { id: 'cust-1' },
        ]);
        mockCustomerService.countByWorkspace.mockResolvedValue(1);
        mockCustomerService.mapList.mockReturnValue(mapped);

        const result = await controller.list(workspace, {
            _limit: 20,
            _offset: 0,
            _order: { createdAt: 'desc' },
            _search: { name: { $ilike: '%ali%' } },
        } as any);

        const find = { name: { $ilike: '%ali%' } };
        expect(mockCustomerService.findByWorkspace).toHaveBeenCalledWith(
            'workspace-1',
            find,
            {
                paging: { limit: 20, offset: 0 },
                order: {
                    createdAt: 'desc',
                    id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC,
                },
            }
        );
        expect(mockCustomerService.countByWorkspace).toHaveBeenCalledWith(
            'workspace-1',
            find
        );
        expect(result).toEqual({
            _pagination: { total: 1, totalPage: 1 },
            data: mapped,
        });
    });

    describe('get', () => {
        it('returns the customer of the credential workspace', async () => {
            mockCustomerService.findOneByIdInWorkspace.mockResolvedValue({
                id: 'cust-1',
            });
            mockCustomerService.mapGet.mockReturnValue({ id: 'cust-1' });

            const result = await controller.get(workspace, 'cust-1');

            expect(
                mockCustomerService.findOneByIdInWorkspace
            ).toHaveBeenCalledWith('cust-1', 'workspace-1');
            expect(result).toEqual({ data: { id: 'cust-1' } });
        });

        it('returns 404 for a customer outside the workspace', async () => {
            mockCustomerService.findOneByIdInWorkspace.mockResolvedValue(null);

            await expect(
                controller.get(workspace, 'cust-elsewhere')
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('update', () => {
        it('is guarded and needs CUSTOMER update', () => {
            const method = CustomerClientController.prototype.update;
            expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
                ClientCredentialGuard,
                ClientCredentialPolicyGuard,
            ]);
            expect(
                Reflect.getMetadata(
                    CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                    method
                )
            ).toEqual([
                {
                    subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                    action: [ENUM_POLICY_ACTION.UPDATE],
                },
            ]);
        });

        it('updates a customer of the credential workspace and logs it as the creator', async () => {
            mockCustomerService.update.mockResolvedValue({ id: 'cust-1' });
            mockCustomerService.mapGet.mockReturnValue({ id: 'cust-1' });

            const result = await controller.update(
                workspace,
                credential,
                'cust-1',
                { notes: 'Prefers Zalo' }
            );

            // The service 404s a customer outside the workspace.
            expect(mockCustomerService.update).toHaveBeenCalledWith(
                'cust-1',
                { notes: 'Prefers Zalo' },
                'workspace-1'
            );
            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalledWith(credential.createdBy, workspace, {
                action: 'update',
                subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                metadata: { id: 'cust-1' },
            });
            expect(result).toEqual({ data: { id: 'cust-1' } });
        });
    });
});
