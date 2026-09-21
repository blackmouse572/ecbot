import { NotFoundException } from '@nestjs/common';
import { CustomerTagWorkspaceController } from '../../../src/modules/customer/controllers/customer-tag.workspace.controller';

// Unit-level controller spec. Cross-workspace tenant isolation, 401/403, and
// param validation are enforced by Nest guards/pipes — see the workspace guard
// specs and the controller spec from #172 for the rationale. Here we only
// assert the controller delegates to CustomerTagService correctly.

const mockCustomerTagService = {
    findAllByWorkspace: jest.fn(),
    findOne: jest.fn(),
    findOneInWorkspace: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    mapGet: jest.fn(),
    mapList: jest.fn(),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

function buildController(): CustomerTagWorkspaceController {
    return new CustomerTagWorkspaceController(
        mockCustomerTagService as any,
        mockActivityService as any
    );
}

describe('CustomerTagWorkspaceController', () => {
    let controller: CustomerTagWorkspaceController;

    const workspace = { id: 'ws-1', name: 'Acme' } as any;
    const user = { id: 'user-1', email: 'op@acme.test' } as any;
    const tagEntity = {
        id: 'tag-1',
        name: 'VIP',
        emoji: '⭐',
        description: 'High value',
        triggersHandoff: false,
    };
    const tagDto = { ...tagEntity };

    beforeEach(() => {
        jest.clearAllMocks();
        controller = buildController();
        mockCustomerTagService.mapGet.mockReturnValue(tagDto);
        mockCustomerTagService.mapList.mockImplementation((tags: any[]) =>
            tags.map(t => ({ ...t }))
        );
    });

    describe('GET /:workspace/customer-tags', () => {
        it('returns the list of catalog tags mapped to DTO, scoped to the workspace', async () => {
            const tags = [
                tagEntity,
                { ...tagEntity, id: 'tag-2', name: 'Hot lead' },
            ];
            mockCustomerTagService.findAllByWorkspace.mockResolvedValue(tags);

            const result = await controller.list(workspace);

            expect(
                mockCustomerTagService.findAllByWorkspace
            ).toHaveBeenCalledWith('ws-1');
            expect(mockCustomerTagService.mapList).toHaveBeenCalledWith(tags);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('GET /:workspace/customer-tags/:customerTag', () => {
        it('returns the mapped tag DTO when found in the workspace (BOLA-safe lookup)', async () => {
            mockCustomerTagService.findOneInWorkspace.mockResolvedValue(
                tagEntity
            );

            const result = await controller.get(workspace, 'tag-1');

            // BOLA-safe: the controller asks for (id, workspaceId), never id alone.
            expect(
                mockCustomerTagService.findOneInWorkspace
            ).toHaveBeenCalledWith('tag-1', 'ws-1');
            expect(mockCustomerTagService.mapGet).toHaveBeenCalledWith(
                tagEntity
            );
            expect(result).toEqual({ data: tagDto });
        });

        it('throws NotFoundException when the tag does not exist in this workspace — collapses missing + cross-workspace into one 404', async () => {
            mockCustomerTagService.findOneInWorkspace.mockResolvedValue(null);

            await expect(
                controller.get(workspace, 'tag-from-other-ws')
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(mockCustomerTagService.mapGet).not.toHaveBeenCalled();
        });
    });

    describe('POST /:workspace/customer-tags', () => {
        it('delegates to service.create with workspace + body fields', async () => {
            mockCustomerTagService.create.mockResolvedValue(tagEntity);

            const dto = {
                name: 'VIP',
                emoji: '⭐',
                description: 'High value',
                triggersHandoff: true,
            };
            const result = await controller.create(workspace, dto as any, user);

            expect(mockCustomerTagService.create).toHaveBeenCalledWith({
                workspace: 'ws-1',
                name: 'VIP',
                emoji: '⭐',
                description: 'High value',
                triggersHandoff: true,
            });
            expect(result).toEqual({ data: tagDto });
        });

        it('defaults triggersHandoff to false when the request omits it', async () => {
            mockCustomerTagService.create.mockResolvedValue(tagEntity);

            await controller.create(
                workspace,
                {
                    name: 'Hot lead',
                } as any,
                user
            );

            const [payload] = mockCustomerTagService.create.mock.calls[0];
            expect(payload.triggersHandoff).toBe(false);
        });
    });

    describe('PATCH /:workspace/customer-tags/:customerTag', () => {
        it('delegates to service.update with id + patch + workspaceId (BOLA-safe)', async () => {
            const updated = { ...tagEntity, name: 'Renamed' };
            mockCustomerTagService.update.mockResolvedValue(updated);
            mockCustomerTagService.mapGet.mockReturnValue({
                ...tagDto,
                name: 'Renamed',
            });

            const dto = { name: 'Renamed' };
            const result = await controller.update(
                workspace,
                'tag-1',
                dto as any,
                user
            );

            // BOLA-safe: workspaceId flows through so the service can refuse
            // patching a tag that lives elsewhere.
            expect(mockCustomerTagService.update).toHaveBeenCalledWith(
                'tag-1',
                dto,
                'ws-1'
            );
            expect(result.data.name).toBe('Renamed');
        });

        it('propagates NotFoundException from the service when the tag resolves outside the workspace', async () => {
            mockCustomerTagService.update.mockRejectedValue(
                new NotFoundException({
                    message: 'customerTag.error.notFound',
                    statusCode: 404,
                })
            );

            await expect(
                controller.update(
                    workspace,
                    'tag-missing',
                    { name: 'x' } as any,
                    user
                )
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('DELETE /:workspace/customer-tags/:customerTag', () => {
        it('delegates to service.delete with the tag id + workspaceId (BOLA-safe)', async () => {
            mockCustomerTagService.delete.mockResolvedValue(undefined);

            const result = await controller.delete(workspace, 'tag-1', user);

            expect(mockCustomerTagService.delete).toHaveBeenCalledWith(
                'tag-1',
                'ws-1'
            );
            expect(result).toBeUndefined();
        });

        it('propagates NotFoundException from the service when the tag resolves outside the workspace', async () => {
            mockCustomerTagService.delete.mockRejectedValue(
                new NotFoundException({
                    message: 'customerTag.error.notFound',
                    statusCode: 404,
                })
            );

            await expect(
                controller.delete(workspace, 'tag-missing', user)
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
