import { MessageProcessorService } from '@app/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '@app/modules/platform/interfaces/platform-adapter.interface';

describe('MessageProcessorService reaction handling', () => {
    const account: any = {
        id: 'account-1',
        type: 'MESSENGER',
        chatbot: { id: 'chatbot-1', workspace: { id: 'workspace-1' } },
    };
    const contactPoint = { id: 'contact-point-1' };
    const conversation = { id: 'conversation-1' };

    function makeService(applyReaction: jest.Mock) {
        const svc = Object.create(MessageProcessorService.prototype) as any;
        svc.accountService = { findOne: jest.fn().mockResolvedValue(account) };
        svc.customerService = {
            resolveContactPoint: jest
                .fn()
                .mockResolvedValue({ contactPoint, customerId: 'customer-1' }),
        };
        svc.conversationService = {
            findOrCreate: jest.fn().mockResolvedValue(conversation),
        };
        svc.messageRepository = { applyReaction };
        svc.logger = { debug: jest.fn(), warn: jest.fn(), log: jest.fn() };
        return svc;
    }

    const reactionEvent: PlatformWebhookEvent = {
        kind: 'reaction',
        accountKey: 'page-123',
        senderId: 'sender-1',
        recipientId: 'page-123',
        externalMessageId: 'msg-1',
        timestamp: new Date(),
        raw: {},
        reaction: { emoji: '👍', messageId: 'msg-1', action: 'react' },
    };

    it('applies a reaction to the matching message', async () => {
        const applyReaction = jest.fn().mockResolvedValue({ id: 'message-1' });
        const svc = makeService(applyReaction);

        await svc.process(reactionEvent);

        expect(svc.conversationService.findOrCreate).toHaveBeenCalledWith({
            chatbotId: 'chatbot-1',
            accountId: 'account-1',
            senderId: 'sender-1',
            contactPointId: 'contact-point-1',
        });
        expect(applyReaction).toHaveBeenCalledWith('conversation-1', 'msg-1', {
            emoji: '👍',
            actorType: 'customer',
            actorId: 'sender-1',
            action: 'react',
        });
    });

    it('is a no-op when the reacted message is not stored (unknown externalId)', async () => {
        const applyReaction = jest.fn().mockResolvedValue(null);
        const svc = makeService(applyReaction);

        await expect(
            svc.process({
                ...reactionEvent,
                reaction: {
                    emoji: '👍',
                    messageId: 'unknown-external-id',
                    action: 'react',
                },
            })
        ).resolves.toBeUndefined();

        expect(applyReaction).toHaveBeenCalledWith(
            'conversation-1',
            'unknown-external-id',
            expect.objectContaining({ emoji: '👍', action: 'react' })
        );
    });
});
