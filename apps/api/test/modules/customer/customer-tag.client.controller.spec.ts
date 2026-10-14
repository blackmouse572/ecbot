import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';
import { CustomerTagClientController } from '../../../src/modules/customer/controllers/customer-tag.client.controller';

// /client surface: the workspace's customer tags, with the same abilities
// as the workspace routes, acting as the credential's creator.

const mockTagService = {
    findAllByWorkspace: jest.fn(),
    findOneInWorkspace: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    mapList: jest.fn(),
    mapGet: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

describe('CustomerTagClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;
    let controller: CustomerTagClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new CustomerTagClientController(
            mockTagService as any,
            mockActivityService as any
        );
    });

    it('is mounted at /customer-tags', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, CustomerTagClientController)
        ).toBe('/customer-tags');
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['create', ENUM_POLICY_ACTION.CREATE],
        ['update', ENUM_POLICY_ACTION.UPDATE],
        ['delete', ENUM_POLICY_ACTION.DELETE],
    ] as const)('%s is guarded and needs CUSTOMER %s', (handler, action) => {
        const method = CustomerTagClientController.prototype[handler];
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

    it('lists the credential workspace tags', async () => {
        mockTagService.findAllByWorkspace.mockResolvedValue([{ id: 'tag-1' }]);
        mockTagService.mapList.mockReturnValue([{ id: 'tag-1' }]);

        await expect(controller.list(workspace)).resolves.toEqual({
            data: [{ id: 'tag-1' }],
        });
        expect(mockTagService.findAllByWorkspace).toHaveBeenCalledWith(
            'workspace-1'
        );
    });

    it('creates a tag in the credential workspace and logs it as the creator', async () => {
        mockTagService.create.mockResolvedValue({ id: 'tag-1', name: 'VIP' });
        mockTagService.mapGet.mockReturnValue({ id: 'tag-1' });

        const result = await controller.create(workspace, credential, {
            name: 'VIP',
        });

        expect(mockTagService.create).toHaveBeenCalledWith({
            workspace: 'workspace-1',
            name: 'VIP',
            emoji: undefined,
            description: undefined,
            triggersHandoff: false,
            notifiesTeam: false,
        });
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'create',
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id: 'tag-1', name: 'VIP' },
        });
        expect(result).toEqual({ data: { id: 'tag-1' } });
    });

    it('updates a tag within the credential workspace', async () => {
        mockTagService.update.mockResolvedValue({ id: 'tag-1', name: 'Gold' });
        mockTagService.mapGet.mockReturnValue({ id: 'tag-1' });

        await controller.update(workspace, credential, 'tag-1', {
            name: 'Gold',
        });

        // The service 404s a tag outside the workspace.
        expect(mockTagService.update).toHaveBeenCalledWith(
            'tag-1',
            { name: 'Gold' },
            'workspace-1'
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'update',
            subject: ENUM_POLICY_SUBJECT.CUSTOMER,
            metadata: { id: 'tag-1', name: 'Gold' },
        });
    });

    it('deletes a tag of the credential workspace and logs it as the creator', async () => {
        mockTagService.findOneInWorkspace.mockResolvedValue({
            id: 'tag-1',
            name: 'VIP',
        });

        await controller.delete(workspace, credential, 'tag-1');

        expect(mockTagService.delete).toHaveBeenCalledWith(
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

    it('404s deleting a tag outside the credential workspace', async () => {
        mockTagService.findOneInWorkspace.mockResolvedValue(null);

        await expect(
            controller.delete(workspace, credential, 'other')
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(mockTagService.delete).not.toHaveBeenCalled();
    });
});
