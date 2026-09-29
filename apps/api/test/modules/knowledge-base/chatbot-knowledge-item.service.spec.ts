import { ChatbotKnowledgeItemService } from 'src/modules/knowledge-base/services/chatbot-knowledge-item.service';
import { ENUM_KNOWLEDGE_FAILURE_KIND } from 'src/modules/knowledge-base/constants/knowledge-ingest.constant';

// #118 / #92: the vector store was told the item's chatbot ids from a read
// that could not see the new link, so it got chatbot_ids: [] and retrieval
// never returned the item. The sync now runs after the controller commits.
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
        const failureNotifier = {
            notifyFailed: jest.fn().mockResolvedValue(undefined),
        };
        const service = new ChatbotKnowledgeItemService(
            {} as any,
            repository as any,
            ragSyncService as any,
            failureNotifier as any
        );
        return { service, repository, ragSyncService, failureNotifier };
    };

    it('does not touch the vector store while the link is uncommitted', async () => {
        const { service, ragSyncService } = setup();

        await service.linkItem('cb-1', 'item-1', {
            em: makeSessionEm(null) as any,
        });
        await service.unlinkItem('cb-1', 'item-1', {
            em: makeSessionEm({ id: 'link-1', deletedAt: null }) as any,
        });

        expect(ragSyncService.updateChatbotLinks).not.toHaveBeenCalled();
    });

    it('syncs the committed chatbot ids for the item', async () => {
        const { service, repository, ragSyncService } = setup();

        await service.syncChatbotLinks('item-1');

        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({ knowledgeItem: 'item-1' }),
            expect.anything()
        );
        expect(ragSyncService.updateChatbotLinks).toHaveBeenCalledWith(
            'item-1',
            ['cb-1']
        );
    });

    it('notifies the owner instead of throwing when the sync cannot be queued', async () => {
        const { service, ragSyncService, failureNotifier } = setup();
        ragSyncService.updateChatbotLinks.mockRejectedValue(
            new Error('queue down')
        );

        await expect(
            service.syncChatbotLinks('item-1')
        ).resolves.toBeUndefined();
        expect(failureNotifier.notifyFailed).toHaveBeenCalledWith(
            'item-1',
            ENUM_KNOWLEDGE_FAILURE_KIND.LINK_SYNC
        );
    });
});
