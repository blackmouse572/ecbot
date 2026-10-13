import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_CHATBOT_STATUS } from '../../../src/modules/chatbot/enums/chatbot.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

/**
 * A turned-off (inactive or archived) agent keeps its channel's inbox: the
 * customer's message is stored and shows in Conversations, as with a
 * conversation whose bot is disabled, but the agent does not answer or hand
 * off until it is activated.
 */
describe('MessageProcessorService — agent turned off', () => {
    let processor: MessageProcessorService;

    const accountService = { findOne: jest.fn() };
    const conversationService = {
        findOrCreate: jest.fn(),
        updateSenderProfile: jest.fn(),
        touchLastMessage: jest.fn(),
        updateStatus: jest.fn(),
        detectHandoffKeywords: jest.fn(() => null),
    };
    const messageRepository = {
        upsertByExternalId: jest.fn().mockResolvedValue({ id: 'msg-row-1' }),
    };
    const adapter = {
        fetchSenderProfile: jest.fn(),
        markRead: jest.fn().mockResolvedValue(undefined),
        startTyping: jest.fn().mockResolvedValue(undefined),
    };
    const registry = { get: jest.fn(() => adapter) };
    const customerService = {
        resolveContactPoint: jest.fn(),
        updateContactPointProfile: jest.fn(),
        fillCustomerNameIfEmpty: jest.fn(),
    };
    const customerTagClassifierService = {
        scheduleAfterMessage: jest.fn().mockResolvedValue(undefined),
    };
    const messageDebounceService = {
        schedule: jest.fn().mockResolvedValue(undefined),
    };
    const actionRouter = {
        dispatch: jest.fn().mockResolvedValue(false),
        register: jest.fn(),
    };
    const chatbotAIService = {
        deleteSession: jest.fn().mockResolvedValue(undefined),
    };
    const lease = { bump: jest.fn(), current: jest.fn(), isCurrent: jest.fn() };
    const dedupe = {
        claim: jest.fn().mockResolvedValue(true),
        release: jest.fn(),
    };

    const live: PlatformWebhookEvent = {
        kind: 'message',
        accountKey: 'page-external-1',
        senderId: 'customer-1',
        recipientId: 'page-external-1',
        text: 'is this still available?',
        externalMessageId: 'm_1',
        timestamp: new Date('2026-10-12T08:00:00Z'),
        raw: {},
    };

    let conversation: Record<string, unknown>;

    beforeEach(() => {
        jest.clearAllMocks();
        processor = new MessageProcessorService(
            accountService as any,
            messageRepository as any,
            registry as any,
            customerService as any,
            customerTagClassifierService as any,
            messageDebounceService as any,
            actionRouter as any,
            { get: jest.fn(() => conversationService) } as any,
            chatbotAIService as any,
            lease as any,
            dedupe as any,
            {} as any
        );
        processor.onModuleInit();

        accountService.findOne.mockResolvedValue({
            id: 'account-1',
            externalId: 'page-external-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            chatbot: {
                id: 'chatbot-1',
                workspace: { id: 'workspace-1' },
                handoffKeywords: [],
                autoRead: true,
                typingIndicator: true,
                status: ENUM_CHATBOT_STATUS.INACTIVE,
            },
        });
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
        });
        conversation = {
            id: 'conv-1',
            status: ENUM_CONVERSATION_STATUS.OPEN,
            botEnabled: true,
            senderProfileFetchedAt: null,
        };
        conversationService.findOrCreate.mockImplementation(
            async () => conversation
        );
        adapter.fetchSenderProfile.mockResolvedValue({
            id: 'customer-1',
            name: 'Lan Nguyen',
            avatar: 'https://cdn/lan.jpg',
        });
    });

    it.each([ENUM_CHATBOT_STATUS.INACTIVE, ENUM_CHATBOT_STATUS.ARCHIVED])(
        'does not answer while the agent is %s',
        async status => {
            const base = await accountService.findOne();
            accountService.findOne.mockResolvedValue({
                ...base,
                chatbot: { ...base.chatbot, status },
            });

            await processor.process(live);

            expect(messageDebounceService.schedule).not.toHaveBeenCalled();
            expect(adapter.startTyping).not.toHaveBeenCalled();
            expect(adapter.markRead).not.toHaveBeenCalled();
        }
    );

    it('still stores the message so it shows in the inbox', async () => {
        await processor.process(live);

        expect(messageRepository.upsertByExternalId).toHaveBeenCalledWith(
            'conv-1',
            'm_1',
            expect.objectContaining({ text: 'is this still available?' })
        );
        expect(conversationService.touchLastMessage).toHaveBeenCalled();
    });

    it('answers once the agent is active', async () => {
        const base = await accountService.findOne();
        accountService.findOne.mockResolvedValue({
            ...base,
            chatbot: { ...base.chatbot, status: ENUM_CHATBOT_STATUS.ACTIVE },
        });

        await processor.process(live);

        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });
});
