import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientCredentialGuard } from '../../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../../src/modules/workspace/repository/entities/workspace.entity';
import { ToolClientController } from '../../../../src/modules/tool/controllers/tool.client.controller';

// /client surface: the workspace's HTTP and MCP tools. The service scopes
// every lookup to the credential's workspace; writes act as its creator.

const mockToolService = {
    findAllByWorkspace: jest.fn(),
    getTotalByWorkspace: jest.fn(),
    mapList: jest.fn(),
    getOne: jest.fn(),
    mapOne: jest.fn(),
    createHttp: jest.fn(),
    createMcpOperator: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn((total: number, limit: number) =>
        Math.ceil(total / limit)
    ),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

describe('ToolClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;
    let controller: ToolClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new ToolClientController(
            mockToolService as any,
            mockPaginationService as any,
            mockActivityService as any
        );
    });

    it('is mounted at /tools', () => {
        expect(Reflect.getMetadata(PATH_METADATA, ToolClientController)).toBe(
            '/tools'
        );
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['get', ENUM_POLICY_ACTION.READ],
        ['createHttp', ENUM_POLICY_ACTION.CREATE],
        ['createMcp', ENUM_POLICY_ACTION.CREATE],
        ['update', ENUM_POLICY_ACTION.UPDATE],
        ['delete', ENUM_POLICY_ACTION.DELETE],
    ] as const)('%s is guarded and needs TOOL %s', (handler, action) => {
        const method = ToolClientController.prototype[handler];
        expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
            ClientCredentialGuard,
            ClientCredentialPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                method
            )
        ).toEqual([{ subject: ENUM_POLICY_SUBJECT.TOOL, action: [action] }]);
    });

    it('documents the kind and status filters', () => {
        const documented = Reflect.getMetadata(
            'swagger/apiParameters',
            ToolClientController.prototype.list
        ).map((param: { name: string }) => param.name);

        expect(documented).toEqual(expect.arrayContaining(['kind', 'status']));
    });

    it('lists the credential workspace tools', async () => {
        mockToolService.findAllByWorkspace.mockResolvedValue([{ id: 't-1' }]);
        mockToolService.getTotalByWorkspace.mockResolvedValue(1);
        mockToolService.mapList.mockReturnValue([{ id: 't-1' }]);

        const result = await controller.list(
            workspace,
            { _search: {}, _limit: 10, _offset: 0, _order: {} } as any,
            { kind: { $in: ['HTTP'] } },
            {}
        );

        expect(mockToolService.findAllByWorkspace).toHaveBeenCalledWith(
            'workspace-1',
            { kind: { $in: ['HTTP'] } },
            { limit: 10, offset: 0, order: {} }
        );
        expect(result).toEqual({
            _pagination: { total: 1, totalPage: 1 },
            data: [{ id: 't-1' }],
        });
    });

    it('gets a tool of the credential workspace', async () => {
        mockToolService.getOne.mockResolvedValue({ id: 't-1' });
        mockToolService.mapOne.mockReturnValue({ id: 't-1' });

        await expect(controller.get(workspace, 't-1')).resolves.toEqual({
            data: { id: 't-1' },
        });
        expect(mockToolService.getOne).toHaveBeenCalledWith(
            'workspace-1',
            't-1'
        );
    });

    it.each([
        ['createHttp', 'createHttp', 'create'],
        ['createMcp', 'createMcpOperator', 'create'],
    ] as const)(
        '%s creates the tool as the creator and logs it',
        async (handler, serviceMethod, activity) => {
            mockToolService[serviceMethod].mockResolvedValue({
                id: 't-1',
                displayName: 'Orders',
            });
            const dto = { name: 'orders' } as any;

            const result = await controller[handler](
                workspace,
                credential,
                dto
            );

            expect(mockToolService[serviceMethod]).toHaveBeenCalledWith(
                'workspace-1',
                dto,
                credential.createdBy
            );
            expect(
                mockActivityService.createByUserWithWorkspace
            ).toHaveBeenCalledWith(credential.createdBy, workspace, {
                action: activity,
                subject: ENUM_POLICY_SUBJECT.TOOL,
                metadata: { id: 't-1', name: 'Orders' },
            });
            expect(result).toEqual({ data: { id: 't-1' } });
        }
    );

    it('updates a tool of the credential workspace as the creator', async () => {
        mockToolService.update.mockResolvedValue({
            id: 't-1',
            displayName: 'Orders',
        });

        await controller.update(workspace, credential, 't-1', {
            description: 'x',
        } as any);

        expect(mockToolService.update).toHaveBeenCalledWith(
            'workspace-1',
            't-1',
            { description: 'x' },
            credential.createdBy
        );
    });

    it('deletes a tool of the credential workspace and logs it', async () => {
        mockToolService.softDelete.mockResolvedValue({
            id: 't-1',
            displayName: 'Orders',
        });

        const result = await controller.delete(workspace, credential, 't-1');

        expect(mockToolService.softDelete).toHaveBeenCalledWith(
            'workspace-1',
            't-1'
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'delete',
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: { id: 't-1', name: 'Orders' },
        });
        expect(result).toEqual({ data: { id: 't-1' } });
    });
});
