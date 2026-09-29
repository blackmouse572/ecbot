import { ChatbotKnowledgeItemService } from 'src/modules/knowledge-base/services/chatbot-knowledge-item.service';

// #118 / #92: the link was written on the request's transactional EntityManager,
// but the chatbot ids for the vector store were read on the default one, which
// cannot see the uncommitted row, so apps/ai got chatbot_ids: [] and retrieval
// never returned the item.
describe('ChatbotKnowledgeItemService link sync', () => {
    const makeSessionEm = (existing: unknown) => ({
        getRepository: jest.fn().mockReturnValue({
            findOne: jest.fn().mockResolvedValue(existing),
        }),
        create: jest.fn((_entity, data) => ({ ...data })),
        getReference: jest.fn((_entity, id) => ({ id })),
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
    });

    const setup = () => {
        const repository = {
            find: jest.fn().mockResolvedValue([{ chatbot: { id: 'cb-1' } }]),
        };
        const ragSyncService = {
            updateChatbotLinks: jest.fn().mockResolvedValue(undefined),
        };
        const service = new ChatbotKnowledgeItemService(
            {} as any,
            repository as any,
            ragSyncService as any
        );
        return { service, repository, ragSyncService };
    };

    it('reads the links on the session EntityManager after linking', async () => {
        const { service, repository, ragSyncService } = setup();
        const em = makeSessionEm(null);

        await service.linkItem('cb-1', 'item-1', { em: em as any });

        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({ knowledgeItem: 'item-1' }),
            expect.objectContaining({ em })
        );
        expect(ragSyncService.updateChatbotLinks).toHaveBeenCalledWith(
            'item-1',
            ['cb-1']
        );
    });

    it('reads the remaining links on the session EntityManager after unlinking', async () => {
        const { service, repository } = setup();
        const em = makeSessionEm({ id: 'link-1', deletedAt: null });

        await service.unlinkItem('cb-1', 'item-1', { em: em as any });

        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({ knowledgeItem: 'item-1' }),
            expect.objectContaining({ em })
        );
    });
});
