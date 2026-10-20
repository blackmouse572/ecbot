import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from 'src/modules/knowledge-base/enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from 'src/modules/knowledge-base/enums/knowledge-base-item-type.enum';
import { KnowledgeItemAdminService } from 'src/modules/knowledge-base/services/knowledge-item.admin.service';

describe('KnowledgeItemAdminService', () => {
    const workspace = {
        id: 'w1',
        name: 'Tiệm Bánh Mây',
        slug: 'tiem-banh-may',
        invitationCode: 'secret-code',
        owner: { id: 'u1', password: 'hash' },
    };
    const item = (id: string, extra: Record<string, any> = {}) => ({
        id,
        title: `Menu ${id}`,
        type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE,
        status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED,
        content: 'extracted text',
        metadata: { fileName: 'menu.pdf', mimeType: 'application/pdf' },
        attachment: {
            bucket: 'private-bucket',
            key: 'knowledge-items/w1/kb1/menu.pdf',
            completedUrl: 'https://s3.example.com/menu.pdf?X-Amz-Signature=x',
            cdnUrl: 'https://cdn.example.com/menu.pdf',
            mime: 'application/pdf',
            size: 2048,
        },
        knowledgeBase: { id: 'kb1', name: 'Main', workspace },
        createdAt: new Date('2026-10-01T00:00:00Z'),
        updatedAt: new Date('2026-10-02T00:00:00Z'),
        ...extra,
    });

    const repository = {
        find: jest.fn(),
        getTotal: jest.fn(),
        findOne: jest.fn(),
        countChunks: jest.fn(),
    };
    const chatbotKnowledgeItemRepository = { findByKnowledgeItem: jest.fn() };
    const service = new KnowledgeItemAdminService(
        repository as any,
        chatbotKnowledgeItemRepository as any
    );

    beforeEach(() => jest.clearAllMocks());

    it.each([
        ['ASC', 'ASC NULLS LAST'],
        ['DESC', 'DESC NULLS LAST'],
    ])(
        'sorts by file size %s with sizeless items last',
        async (direction, expected) => {
            repository.find.mockResolvedValue([]);
            repository.countChunks.mockResolvedValue(new Map());

            await service.findAll(
                {},
                { limit: 20, offset: 0, order: { size: direction } as any }
            );

            expect(repository.find).toHaveBeenCalledWith(
                { deletedAt: null },
                {
                    limit: 20,
                    offset: 0,
                    orderBy: { attachment: { size: expected } },
                    populate: ['knowledgeBase.workspace'],
                }
            );
        }
    );

    it('lists items with workspace, size and batched chunk counts, without content or storage fields', async () => {
        repository.find.mockResolvedValue([item('i1'), item('i2')]);
        repository.countChunks.mockResolvedValue(new Map([['i1', 12]]));

        const rows = await service.findAll(
            { type: { $in: ['FILE'] } },
            { limit: 20, offset: 0 }
        );

        expect(repository.find).toHaveBeenCalledWith(
            { deletedAt: null, type: { $in: ['FILE'] } },
            {
                limit: 20,
                offset: 0,
                populate: ['knowledgeBase.workspace'],
            }
        );
        expect(repository.countChunks).toHaveBeenCalledTimes(1);
        expect(repository.countChunks).toHaveBeenCalledWith(['i1', 'i2']);
        expect(rows[0]).toEqual({
            id: 'i1',
            title: 'Menu i1',
            type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE,
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED,
            size: 2048,
            chunkCount: 12,
            workspace: {
                id: 'w1',
                name: 'Tiệm Bánh Mây',
                slug: 'tiem-banh-may',
            },
            createdAt: new Date('2026-10-01T00:00:00Z'),
            updatedAt: new Date('2026-10-02T00:00:00Z'),
        });
        expect(rows[1]).toMatchObject({ id: 'i2', chunkCount: 0 });
    });

    it('turns the chatbot filter into a filter on live links to that chatbot', async () => {
        repository.find.mockResolvedValue([]);
        repository.countChunks.mockResolvedValue(new Map());
        repository.getTotal.mockResolvedValue(0);
        const find = {
            chatbot: { $eq: 'c1' },
            knowledgeBase: { workspace: { $eq: 'w1' } },
        };
        const where = {
            deletedAt: null,
            knowledgeBase: { workspace: { $eq: 'w1' } },
            chatbotLinks: {
                chatbot: { $eq: 'c1' },
                isActive: true,
                deletedAt: null,
            },
        };

        await service.findAll(find, { limit: 10 });
        await service.getTotal(find);

        expect(repository.find).toHaveBeenCalledWith(where, {
            limit: 10,
            populate: ['knowledgeBase.workspace'],
        });
        expect(repository.getTotal).toHaveBeenCalledWith(where);
    });

    it('returns one item with its source, chunk count and live linked chatbots', async () => {
        repository.findOne.mockResolvedValue(
            item('i1', {
                status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
                errorMessage: 'File format not supported',
            })
        );
        repository.countChunks.mockResolvedValue(new Map([['i1', 3]]));
        chatbotKnowledgeItemRepository.findByKnowledgeItem.mockResolvedValue([
            { chatbot: { id: 'c1', name: 'Sales', systemPrompt: 'secret' } },
            { chatbot: { id: 'c2', name: 'Old', deletedAt: new Date() } },
        ]);

        const data = await service.findOneById('i1');

        expect(repository.findOne).toHaveBeenCalledWith(
            { id: 'i1', deletedAt: null },
            { populate: ['knowledgeBase.workspace.owner'] }
        );
        expect(data).toMatchObject({
            id: 'i1',
            chunkCount: 3,
            size: 2048,
            fileName: 'menu.pdf',
            mimeType: 'application/pdf',
            status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.FAILED,
            errorMessage: 'File format not supported',
            chatbots: [{ id: 'c1', name: 'Sales' }],
        });
        expect(data.chatbots[0]).not.toHaveProperty('systemPrompt');
        expect(data).not.toHaveProperty('content');
        expect(data).not.toHaveProperty('attachment');
        expect(data.workspace).not.toHaveProperty('invitationCode');
        expect(data.workspace).not.toHaveProperty('owner');
        expect(JSON.stringify(data)).not.toMatch(/X-Amz-Signature|bucket/);
    });

    it('gives the page address as the source of a URL item', async () => {
        repository.findOne.mockResolvedValue(
            item('i1', {
                type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.URL,
                content: 'https://shop.vn/faq',
                metadata: { url: 'https://shop.vn/faq', crawlDepth: 1 },
                attachment: undefined,
            })
        );
        repository.countChunks.mockResolvedValue(new Map());
        chatbotKnowledgeItemRepository.findByKnowledgeItem.mockResolvedValue(
            []
        );

        const data = await service.findOneById('i1');

        expect(data).toMatchObject({
            sourceUrl: 'https://shop.vn/faq',
            chunkCount: 0,
            chatbots: [],
        });
        expect(data.size).toBeUndefined();
    });

    it('returns null for a missing or deleted item', async () => {
        repository.findOne.mockResolvedValue(null);

        await expect(service.findOneById('nope')).resolves.toBeNull();
        expect(repository.countChunks).not.toHaveBeenCalled();
    });
});
