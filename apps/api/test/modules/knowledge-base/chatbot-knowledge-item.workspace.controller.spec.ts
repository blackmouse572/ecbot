import { NotFoundException } from '@nestjs/common';
import { ChatbotKnowledgeItemWorkspaceController } from '@app/modules/knowledge-base/controllers/chatbot-knowledge-item.workspace.controller';

describe('ChatbotKnowledgeItemWorkspaceController.link', () => {
    let controller: ChatbotKnowledgeItemWorkspaceController;
    let chatbotService: { findOne: jest.Mock };
    let knowledgeItemRepository: { findOne: jest.Mock };
    let chatbotKnowledgeItemService: {
        linkItem: jest.Mock;
        syncChatbotLinks: jest.Mock;
    };
    let em: { fork: jest.Mock };
    let session: {
        begin: jest.Mock;
        commit: jest.Mock;
        rollback: jest.Mock;
        getRepository: jest.Mock;
    };

    const user = { id: 'user-1' } as any;
    const workspace = { id: 'workspace-1' } as any;

    beforeEach(() => {
        chatbotService = { findOne: jest.fn() };
        knowledgeItemRepository = { findOne: jest.fn() };
        chatbotKnowledgeItemService = {
            linkItem: jest.fn(),
            syncChatbotLinks: jest.fn().mockResolvedValue(undefined),
        };
        session = {
            begin: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            getRepository: jest.fn(() => knowledgeItemRepository),
        };
        em = { fork: jest.fn(() => session) };

        controller = new ChatbotKnowledgeItemWorkspaceController(
            em as any,
            chatbotService as any,
            {} as any,
            chatbotKnowledgeItemService as any,
            {} as any,
            { createByUser: jest.fn() } as any
        );
    });

    it('returns 404 when the knowledge item belongs to another workspace', async () => {
        chatbotService.findOne.mockResolvedValue({ id: 'chatbot-1' });
        knowledgeItemRepository.findOne.mockResolvedValue({
            id: 'item-1',
            knowledgeBase: { workspace: { id: 'other-workspace' } },
        });

        await expect(
            controller.link(user, workspace, 'chatbot-1', 'item-1')
        ).rejects.toThrow(NotFoundException);

        expect(chatbotKnowledgeItemService.linkItem).not.toHaveBeenCalled();
        expect(
            chatbotKnowledgeItemService.syncChatbotLinks
        ).not.toHaveBeenCalled();
        expect(session.rollback).toHaveBeenCalled();
    });

    it('links the item when its knowledge base belongs to the workspace', async () => {
        chatbotService.findOne.mockResolvedValue({ id: 'chatbot-1' });
        knowledgeItemRepository.findOne.mockResolvedValue({
            id: 'item-1',
            knowledgeBase: { workspace: { id: 'workspace-1' } },
        });
        chatbotKnowledgeItemService.linkItem.mockResolvedValue({
            id: 'link-1',
        });

        const result = await controller.link(
            user,
            workspace,
            'chatbot-1',
            'item-1'
        );

        expect(result.data.id).toBe('link-1');
        expect(session.commit).toHaveBeenCalled();
        // Review of #202: the vector store is synced only after the commit,
        // so a failed commit cannot re-link the item there.
        expect(
            chatbotKnowledgeItemService.syncChatbotLinks
        ).toHaveBeenCalledWith('item-1');
        expect(session.commit.mock.invocationCallOrder[0]).toBeLessThan(
            chatbotKnowledgeItemService.syncChatbotLinks.mock
                .invocationCallOrder[0]
        );
    });
});
