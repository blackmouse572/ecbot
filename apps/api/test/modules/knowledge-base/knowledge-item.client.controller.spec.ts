import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { KnowledgeItemClientController } from '../../../src/modules/knowledge-base/controllers/knowledge-item.client.controller';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';

// /client surface: the knowledge base must belong to the credential's
// workspace before any of its items are read.

const mockKnowledgeItemService = {
    find: jest.fn(),
    getTotal: jest.fn(),
    findOne: jest.fn(),
    mapList: jest.fn(),
    mapGet: jest.fn(),
};

const mockKnowledgeBaseService = {
    findOne: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn((total: number, limit: number) =>
        Math.ceil(total / limit)
    ),
};

const mockAwsS3Service = {
    presignGetItem: jest.fn(),
};

describe('KnowledgeItemClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    let controller: KnowledgeItemClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new KnowledgeItemClientController(
            mockKnowledgeItemService as any,
            mockKnowledgeBaseService as any,
            mockPaginationService as any,
            mockAwsS3Service as any
        );
    });

    it('is mounted under its knowledge base', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, KnowledgeItemClientController)
        ).toBe('/knowledge-bases/:knowledgeBaseId/items');
    });

    it.each(['list', 'get'] as const)(
        '%s is guarded by the client credential and the creator policy',
        handler => {
            expect(
                Reflect.getMetadata(
                    GUARDS_METADATA,
                    KnowledgeItemClientController.prototype[handler]
                )
            ).toEqual([ClientCredentialGuard, ClientCredentialPolicyGuard]);
        }
    );

    // Same ability as the matching workspace route: the key can do no more
    // than its creator.
    it.each(['list', 'get'] as const)(
        '%s requires KNOWLEDGE_BASE read',
        handler => {
            expect(
                Reflect.getMetadata(
                    CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                    KnowledgeItemClientController.prototype[handler]
                )
            ).toEqual([
                {
                    subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                    action: [ENUM_POLICY_ACTION.READ],
                },
            ]);
        }
    );

    // @repo/client is generated from these docs, so an undocumented filter
    // is one the MCP server can't send.
    it('documents every list filter it accepts', () => {
        const documented = Reflect.getMetadata(
            'swagger/apiParameters', // @nestjs/swagger DECORATORS.API_PARAMETERS
            KnowledgeItemClientController.prototype.list
        ).map((param: { name: string }) => param.name);

        expect(documented).toEqual(
            expect.arrayContaining([
                'knowledgeBaseId',
                'type',
                'status',
                'tags',
            ])
        );
    });

    describe('list', () => {
        it('lists items of a knowledge base in the credential workspace', async () => {
            const mapped = [{ id: 'item-1', title: 'Shipping' }];
            mockKnowledgeBaseService.findOne.mockResolvedValue({ id: 'kb-1' });
            mockKnowledgeItemService.find.mockResolvedValue([{ id: 'item-1' }]);
            mockKnowledgeItemService.getTotal.mockResolvedValue(1);
            mockKnowledgeItemService.mapList.mockReturnValue(mapped);

            const result = await controller.list(
                workspace,
                'kb-1',
                {
                    _limit: 20,
                    _offset: 0,
                    _order: { createdAt: 'desc' },
                    _search: { title: { $ilike: '%ship%' } },
                } as any,
                { type: { $in: ['TEXT'] } },
                { status: { $in: ['COMPLETED'] } },
                {}
            );

            expect(mockKnowledgeBaseService.findOne).toHaveBeenCalledWith({
                id: 'kb-1',
                workspace: 'workspace-1',
                deletedAt: null,
            });
            const find = {
                title: { $ilike: '%ship%' },
                type: { $in: ['TEXT'] },
                status: { $in: ['COMPLETED'] },
                knowledgeBase: 'kb-1',
                deletedAt: null,
            };
            expect(mockKnowledgeItemService.find).toHaveBeenCalledWith(
                find,
                expect.objectContaining({ limit: 20, offset: 0 })
            );
            expect(mockKnowledgeItemService.getTotal).toHaveBeenCalledWith(
                find
            );
            expect(result).toEqual({
                _pagination: { total: 1, totalPage: 1 },
                data: mapped,
            });
        });

        it('returns 404 for a knowledge base outside the credential workspace', async () => {
            mockKnowledgeBaseService.findOne.mockResolvedValue(null);

            await expect(
                controller.list(
                    workspace,
                    'kb-elsewhere',
                    { _limit: 20, _offset: 0, _order: {}, _search: {} } as any,
                    {},
                    {},
                    {}
                )
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(mockKnowledgeItemService.find).not.toHaveBeenCalled();
        });
    });

    describe('get', () => {
        it('returns an item of a knowledge base in the credential workspace', async () => {
            const mapped = { id: 'item-1', title: 'Shipping' };
            mockKnowledgeBaseService.findOne.mockResolvedValue({ id: 'kb-1' });
            mockKnowledgeItemService.findOne.mockResolvedValue({
                id: 'item-1',
            });
            mockKnowledgeItemService.mapGet.mockReturnValue(mapped);

            const result = await controller.get(workspace, 'kb-1', 'item-1');

            expect(mockKnowledgeItemService.findOne).toHaveBeenCalledWith(
                { id: 'item-1', knowledgeBase: 'kb-1', deletedAt: null },
                { populate: ['createdBy', 'updatedBy', 'tags'] }
            );
            expect(result).toEqual({ data: mapped });
        });

        it('swaps an attachment for a short-lived signed URL', async () => {
            const item = {
                id: 'item-1',
                attachment: { key: 'kb/doc.pdf', cdnUrl: 'private-url' },
            };
            mockKnowledgeBaseService.findOne.mockResolvedValue({ id: 'kb-1' });
            mockKnowledgeItemService.findOne.mockResolvedValue(item);
            mockAwsS3Service.presignGetItem.mockResolvedValue({
                presignUrl: 'signed-url',
            });
            mockKnowledgeItemService.mapGet.mockImplementation(i => i);

            await controller.get(workspace, 'kb-1', 'item-1');

            expect(item.attachment.cdnUrl).toBe('signed-url');
        });

        it.each([
            ['the knowledge base is outside the workspace', null, null],
            ['the item is missing', { id: 'kb-1' }, null],
        ])('returns 404 when %s', async (_case, knowledgeBase, item) => {
            mockKnowledgeBaseService.findOne.mockResolvedValue(knowledgeBase);
            mockKnowledgeItemService.findOne.mockResolvedValue(item);

            await expect(
                controller.get(workspace, 'kb-1', 'item-1')
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
