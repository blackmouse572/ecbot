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
    create: jest.fn(),
    update: jest.fn(),
    mapShort: jest.fn(),
    softDelete: jest.fn(),
};

const mockFolderService = {
    findOne: jest.fn(),
};

const mockActivityService = {
    createByUser: jest.fn(),
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

const mockUploadService = {
    store: jest.fn(),
    readUpload: jest.fn(),
    download: jest.fn(),
    discardUpload: jest.fn(),
    createUploadUrl: jest.fn(),
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
            mockAwsS3Service as any,
            mockFolderService as any,
            mockActivityService as any,
            mockUploadService as any
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

    describe('writes', () => {
        const credential = { createdBy: { id: 'creator-1' } } as any;
        const item = { id: 'item-1', type: 'TEXT', title: 'Opening hours' };

        it.each([
            ['create', ENUM_POLICY_ACTION.CREATE],
            ['update', ENUM_POLICY_ACTION.UPDATE],
            ['delete', ENUM_POLICY_ACTION.DELETE],
        ] as const)(
            '%s is guarded and needs KNOWLEDGE_BASE %s',
            (handler, action) => {
                const method = KnowledgeItemClientController.prototype[handler];
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
                        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                        action: [action],
                    },
                ]);
            }
        );

        describe('create', () => {
            it('creates a text item in a knowledge base of the credential workspace', async () => {
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockKnowledgeItemService.create.mockResolvedValue(item);
                mockKnowledgeItemService.mapShort.mockReturnValue({
                    id: 'item-1',
                });

                const result = await controller.create(
                    workspace,
                    credential,
                    'kb-1',
                    {
                        type: 'TEXT',
                        title: 'Opening hours',
                        content: '9 to 5',
                    } as any
                );

                expect(mockKnowledgeBaseService.findOne).toHaveBeenCalledWith({
                    id: 'kb-1',
                    workspace: 'workspace-1',
                    deletedAt: null,
                });
                expect(mockKnowledgeItemService.create).toHaveBeenCalledWith(
                    {
                        type: 'TEXT',
                        title: 'Opening hours',
                        content: '9 to 5',
                        folder: undefined,
                        knowledgeBase: 'kb-1',
                        workspace: 'workspace-1',
                    },
                    { actionBy: 'creator-1' }
                );
                expect(mockActivityService.createByUser).toHaveBeenCalledWith(
                    credential.createdBy,
                    {
                        action: 'create',
                        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                        metadata: {
                            knowledgeBaseId: 'kb-1',
                            itemId: 'item-1',
                            itemType: 'TEXT',
                            itemTitle: 'Opening hours',
                        },
                    }
                );
                expect(result).toEqual({ data: { id: 'item-1' } });
            });

            it.each([
                ['no source', {}],
                [
                    'both sources',
                    { fileKey: 'k', fileUrl: 'https://x.test/a.pdf' },
                ],
            ])('refuses a file item with %s', async (_label, source) => {
                await expect(
                    controller.create(workspace, credential, 'kb-1', {
                        type: 'FILE',
                        title: 'Menu',
                        ...source,
                    } as any)
                ).rejects.toMatchObject({
                    response: { message: 'knowledgeItem.error.fileSource' },
                });
                expect(mockKnowledgeItemService.create).not.toHaveBeenCalled();
            });

            it('refuses a file source on a text item', async () => {
                await expect(
                    controller.create(workspace, credential, 'kb-1', {
                        type: 'TEXT',
                        title: 'Hours',
                        fileUrl: 'https://x.test/a.pdf',
                    } as any)
                ).rejects.toMatchObject({
                    response: { message: 'knowledgeItem.error.fileSource' },
                });
            });

            it.each(['TEXT', 'URL'])(
                'refuses a %s item with no content',
                async type => {
                    await expect(
                        controller.create(workspace, credential, 'kb-1', {
                            type,
                            title: 'Hours',
                            content: ' ',
                        } as any)
                    ).rejects.toMatchObject({
                        response: {
                            message: 'knowledgeItem.error.contentRequired',
                        },
                    });
                    expect(
                        mockKnowledgeItemService.create
                    ).not.toHaveBeenCalled();
                }
            );

            it('drops a presigned upload when the create fails', async () => {
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockUploadService.readUpload.mockResolvedValue({});
                mockUploadService.store.mockRejectedValue(new Error('quota'));

                await expect(
                    controller.create(workspace, credential, 'kb-1', {
                        type: 'MEDIA',
                        title: 'Menu',
                        fileKey: 'knowledge-uploads/workspace-1/kb-1/x.pdf',
                    } as any)
                ).rejects.toThrow('quota');
                expect(mockUploadService.discardUpload).toHaveBeenCalledWith(
                    'knowledge-uploads/workspace-1/kb-1/x.pdf'
                );
            });

            it('creates a media item from a presigned upload, then drops the upload', async () => {
                const file = { originalname: 'menu.pdf' };
                const stored = {
                    attachment: { key: 'knowledge-media/menu.pdf' },
                    metadata: {
                        fileName: 'menu.pdf',
                        mimeType: 'application/pdf',
                    },
                };
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockUploadService.readUpload.mockResolvedValue(file);
                mockUploadService.store.mockResolvedValue(stored);
                mockKnowledgeItemService.create.mockResolvedValue(item);

                await controller.create(workspace, credential, 'kb-1', {
                    type: 'MEDIA',
                    title: 'Menu',
                    fileKey: 'knowledge-uploads/workspace-1/kb-1/x-menu.pdf',
                } as any);

                expect(mockUploadService.readUpload).toHaveBeenCalledWith(
                    'workspace-1',
                    'kb-1',
                    'knowledge-uploads/workspace-1/kb-1/x-menu.pdf'
                );
                expect(mockUploadService.store).toHaveBeenCalledWith(
                    'workspace-1',
                    'kb-1',
                    'MEDIA',
                    file
                );
                expect(mockKnowledgeItemService.create).toHaveBeenCalledWith(
                    expect.objectContaining({ type: 'MEDIA', ...stored }),
                    { actionBy: 'creator-1' }
                );
                expect(mockUploadService.discardUpload).toHaveBeenCalledWith(
                    'knowledge-uploads/workspace-1/kb-1/x-menu.pdf'
                );
            });

            it('creates a file item from a public link', async () => {
                const file = { originalname: 'faq.pdf' };
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockUploadService.download.mockResolvedValue(file);
                mockUploadService.store.mockResolvedValue({
                    attachment: {},
                    metadata: {},
                });
                mockKnowledgeItemService.create.mockResolvedValue(item);

                await controller.create(workspace, credential, 'kb-1', {
                    type: 'FILE',
                    title: 'FAQ',
                    fileUrl: 'https://shop.test/faq.pdf',
                } as any);

                expect(mockUploadService.download).toHaveBeenCalledWith(
                    'https://shop.test/faq.pdf'
                );
                expect(mockUploadService.store).toHaveBeenCalledWith(
                    'workspace-1',
                    'kb-1',
                    'FILE',
                    file
                );
                expect(mockUploadService.discardUpload).not.toHaveBeenCalled();
            });

            it('404s a knowledge base outside the credential workspace', async () => {
                mockKnowledgeBaseService.findOne.mockResolvedValue(null);

                await expect(
                    controller.create(workspace, credential, 'other', {
                        type: 'TEXT',
                        title: 'x',
                        content: 'Open 9am',
                    } as any)
                ).rejects.toBeInstanceOf(NotFoundException);
                expect(mockKnowledgeItemService.create).not.toHaveBeenCalled();
            });

            it('404s a folder outside the knowledge base', async () => {
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockFolderService.findOne.mockResolvedValue(null);

                await expect(
                    controller.create(workspace, credential, 'kb-1', {
                        type: 'TEXT',
                        title: 'x',
                        content: 'Open 9am',
                        folderId: 'folder-9',
                    } as any)
                ).rejects.toBeInstanceOf(NotFoundException);
                expect(mockFolderService.findOne).toHaveBeenCalledWith({
                    id: 'folder-9',
                    knowledgeBase: 'kb-1',
                });
            });
        });

        describe('update', () => {
            it('updates an item of the knowledge base as the creator', async () => {
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockKnowledgeItemService.findOne.mockResolvedValue(item);
                mockKnowledgeItemService.update.mockResolvedValue(item);
                mockKnowledgeItemService.mapShort.mockReturnValue({
                    id: 'item-1',
                });

                const result = await controller.update(
                    workspace,
                    credential,
                    'kb-1',
                    'item-1',
                    { status: 'READY' } as any
                );

                expect(mockKnowledgeItemService.findOne).toHaveBeenCalledWith({
                    id: 'item-1',
                    knowledgeBase: 'kb-1',
                    deletedAt: null,
                });
                expect(mockKnowledgeItemService.update).toHaveBeenCalledWith(
                    'item-1',
                    { status: 'READY' },
                    { actionBy: 'creator-1' }
                );
                expect(mockActivityService.createByUser).toHaveBeenCalledWith(
                    credential.createdBy,
                    expect.objectContaining({ action: 'update' })
                );
                expect(result).toEqual({ data: { id: 'item-1' } });
            });

            it('404s an item that is not in the knowledge base', async () => {
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockKnowledgeItemService.findOne.mockResolvedValue(null);

                await expect(
                    controller.update(
                        workspace,
                        credential,
                        'kb-1',
                        'item-9',
                        {}
                    )
                ).rejects.toBeInstanceOf(NotFoundException);
                expect(mockKnowledgeItemService.update).not.toHaveBeenCalled();
            });
        });

        describe('delete', () => {
            it('deletes an item of the knowledge base as the creator', async () => {
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockKnowledgeItemService.findOne.mockResolvedValue(item);

                const result = await controller.delete(
                    workspace,
                    credential,
                    'kb-1',
                    'item-1'
                );

                expect(
                    mockKnowledgeItemService.softDelete
                ).toHaveBeenCalledWith('item-1', { actionBy: 'creator-1' });
                expect(mockActivityService.createByUser).toHaveBeenCalledWith(
                    credential.createdBy,
                    {
                        action: 'delete',
                        subject: ENUM_POLICY_SUBJECT.KNOWLEDGE_BASE,
                        metadata: {
                            knowledgeBaseId: 'kb-1',
                            itemId: 'item-1',
                            itemType: 'TEXT',
                            itemTitle: 'Opening hours',
                        },
                    }
                );
                expect(result).toEqual({ data: { id: 'item-1' } });
            });

            it('404s an item outside the knowledge base, deleting nothing', async () => {
                mockKnowledgeBaseService.findOne.mockResolvedValue({
                    id: 'kb-1',
                });
                mockKnowledgeItemService.findOne.mockResolvedValue(null);

                await expect(
                    controller.delete(workspace, credential, 'kb-1', 'item-9')
                ).rejects.toBeInstanceOf(NotFoundException);
                expect(
                    mockKnowledgeItemService.softDelete
                ).not.toHaveBeenCalled();
            });
        });
    });
});
