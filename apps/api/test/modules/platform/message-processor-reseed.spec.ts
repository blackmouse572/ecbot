import { MessageProcessorService } from '@app/modules/platform/services/message-processor.service';
import { ENUM_CONVERSATION_STATUS } from '@app/modules/conversation/enums/conversation.enum';

describe('MessageProcessorService reseed-on-resume', () => {
    it('deletes the AI session when a RESOLVED conversation is re-opened for the bot', async () => {
        const deleteSession = jest.fn().mockResolvedValue(undefined);
        const updateStatus = jest.fn().mockResolvedValue(undefined);

        const conversation: any = {
            id: 'conv-1',
            status: ENUM_CONVERSATION_STATUS.RESOLVED,
            botEnabled: false,
        };

        // Exercise the private resume branch directly.
        const svc = Object.create(MessageProcessorService.prototype) as any;
        svc.chatbotAIService = { deleteSession };
        svc.conversationService = { updateStatus };

        await svc.resumeBotIfResolved(conversation);

        expect(updateStatus).toHaveBeenCalledWith(
            'conv-1',
            ENUM_CONVERSATION_STATUS.OPEN
        );
        expect(deleteSession).toHaveBeenCalledWith('conv-1');
        expect(conversation.botEnabled).toBe(true);
    });

    it('does nothing when the conversation is not RESOLVED', async () => {
        const deleteSession = jest.fn();
        const svc = Object.create(MessageProcessorService.prototype) as any;
        svc.chatbotAIService = { deleteSession };
        svc.conversationService = { updateStatus: jest.fn() };

        const conversation: any = {
            id: 'c',
            status: ENUM_CONVERSATION_STATUS.OPEN,
            botEnabled: true,
        };
        await svc.resumeBotIfResolved(conversation);
        expect(deleteSession).not.toHaveBeenCalled();
    });
});
