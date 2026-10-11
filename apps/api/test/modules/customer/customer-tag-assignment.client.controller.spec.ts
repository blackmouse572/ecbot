import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';
import { CustomerTagAssignmentClientController } from '../../../src/modules/customer/controllers/customer-tag-assignment.client.controller';

// /client surface: tagging a customer. The service checks that both the
// customer and the tag are in the credential's workspace.

const mockAssignmentService = {
    listByCustomer: jest.fn(),
    apply: jest.fn(),
    remove: jest.fn(),
    mapList: jest.fn(),
    mapGet: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

describe('CustomerTagAssignmentClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;
    let controller: CustomerTagAssignmentClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new CustomerTagAssignmentClientController(
            mockAssignmentService as any,
            mockActivityService as any
        );
    });

    it('is mounted under its customer', () => {
        expect(
            Reflect.getMetadata(
                PATH_METADATA,
                CustomerTagAssignmentClientController
            )
        ).toBe('/customers/:customerId/tags');
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['apply', ENUM_POLICY_ACTION.UPDATE],
        ['remove', ENUM_POLICY_ACTION.UPDATE],
    ] as const)('%s is guarded and needs CUSTOMER %s', (handler, action) => {
        const method = CustomerTagAssignmentClientController.prototype[handler];
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
            { subject: ENUM_POLICY_SUBJECT.CUSTOMER, action: [action] },
        ]);
    });

    it("lists a customer's tags in the credential workspace", async () => {
        mockAssignmentService.listByCustomer.mockResolvedValue([{ id: 'a-1' }]);
        mockAssignmentService.mapList.mockReturnValue([{ id: 'a-1' }]);

        await expect(controller.list(workspace, 'cust-1')).resolves.toEqual({
            data: [{ id: 'a-1' }],
        });
        expect(mockAssignmentService.listByCustomer).toHaveBeenCalledWith(
            'cust-1',
            'workspace-1'
        );
    });

    it('tags a customer and logs it as the creator', async () => {
        mockAssignmentService.apply.mockResolvedValue({ id: 'a-1' });
        mockAssignmentService.mapGet.mockReturnValue({ id: 'a-1' });

        const result = await controller.apply(
            workspace,
            credential,
            'cust-1',
            'tag-1'
        );

        expect(mockAssignmentService.apply).toHaveBeenCalledWith(
            'cust-1',
            'tag-1',
            'workspace-1'
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'create',
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id: 'a-1', name: 'tag-1' },
        });
        expect(result).toEqual({ data: { id: 'a-1' } });
    });

    it('untags a customer and logs it as the creator', async () => {
        mockAssignmentService.remove.mockResolvedValue({ name: 'VIP' });

        await controller.remove(workspace, credential, 'cust-1', 'tag-1');

        expect(mockAssignmentService.remove).toHaveBeenCalledWith(
            'cust-1',
            'tag-1',
            'workspace-1'
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'delete',
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id: 'tag-1', name: 'VIP' },
        });
    });
});
