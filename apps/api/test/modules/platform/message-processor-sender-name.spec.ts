import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

describe('MessageProcessorService — sender name from the webhook', () => {
    let processor: MessageProcessorService;

    const accountService = { findOne: jest.fn() };
    const conversationService = {
        findOrCreate: jest.fn(),
        updateSenderProfile: jest.fn(),
        touchLastMessage: jest.fn(),
        updateStatus: jest.fn(),
        detectHandoffKeywords: jest.fn(() => false),
        triggerHandoff: jest.fn(),
        recordFallback: jest.fn(),
        resetFallbackCount: jest.fn(),
    };
    const messageRepository = {
        upsertByExternalId: jest.fn(),
        insertPendingOutbound: jest.fn(),
        markOutboundSent: jest.fn(),
        markOutboundFailed: jest.fn(),
    };
    const adapterMessaging = {
        sendMessage: jest.fn(),
        fetchSenderProfile: jest.fn(),
        markRead: jest.fn(),
        sendTyping: jest.fn(),
    };
    const registry = {
        get: jest.fn(() => adapterMessaging),
    };
    const customerService = {
        resolveContactPoint: jest.fn(),
        updateContactPointProfile: jest.fn(),
        fillCustomerNameIfEmpty: jest.fn(),
    };
    // #170: the processor fire-and-forget schedules the tag classifier.
    const customerTagClassifierService = {
        scheduleAfterMessage: jest.fn().mockResolvedValue(undefined),
    };
    // The AI reply runs in a debounced BullMQ job; process() only schedules it
    // and threads the customer context through.
    const messageDebounceService = {
        schedule: jest.fn().mockResolvedValue(undefined),
    };
    const chatbotAIService = {
        deleteSession: jest.fn().mockResolvedValue(undefined),
    };
    const lease = {
        bump: jest.fn().mockResolvedValue(1),
        current: jest.fn().mockResolvedValue(0),
        isCurrent: jest.fn().mockResolvedValue(true),
    };

    const baseEvent: PlatformWebhookEvent = {
        kind: 'message',
        accountKey: 'page-external-1',
        senderId: 'sender-fb-1',
        recipientId: 'page-external-1',
        text: 'Hello',
        externalMessageId: 'msg-1',
        timestamp: new Date('2026-06-15T12:00:00Z'),
        raw: {},
    };

    const accountFixture = {
        id: 'account-1',
        externalId: 'page-external-1',
        type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
        chatbot: {
            id: 'chatbot-1',
            workspace: { id: 'workspace-1' },
            handoffKeywords: [],
            handoffFallbackThreshold: 3,
            handoffMessage: null,
            fallbackMessage: null,
            autoRead: false,
            typingIndicator: false,
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        const mockModuleRef = { get: jest.fn(() => conversationService) };
        processor = new MessageProcessorService(
            accountService as any,
            messageRepository as any,
            registry as any,
            customerService as any,
            customerTagClassifierService as any,
            messageDebounceService as any,
            {
                dispatch: jest.fn().mockResolvedValue(false),
                register: jest.fn(),
            } as any,
            mockModuleRef as any,
            chatbotAIService as any,
            lease as any,
            { claim: jest.fn().mockResolvedValue(true) } as any,
            {} as any
        );
        processor.onModuleInit();

        accountService.findOne.mockResolvedValue(accountFixture);
        conversationService.recordFallback.mockResolvedValue({
            triggered: false,
            conversation: { id: 'conv-existing' },
        });
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-42', customer: { id: 'cust-42' } },
            customerId: 'cust-42',
            created: false,
        });
        conversationService.findOrCreate.mockResolvedValue({
            id: 'conv-existing',
            status: ENUM_CONVERSATION_STATUS.OPEN,
            botEnabled: true,
            senderId: 'sender-fb-1',
            senderProfileFetchedAt: null, // stale — profile is fetched
            contactPoint: { id: 'cp-42' },
            fallbackCount: 0,
        });
    });

    // WhatsApp has no profile lookup: the adapter returns no name and ships
    // it on the event instead.
    it('falls back to event.senderName when the profile has no name', async () => {
        adapterMessaging.fetchSenderProfile.mockResolvedValue({
            id: 'sender-fb-1',
        });

        await processor.process({ ...baseEvent, senderName: 'Lan' });

        expect(conversationService.updateSenderProfile).toHaveBeenCalledWith(
            'conv-existing',
            expect.objectContaining({ senderName: 'Lan' })
        );
        expect(customerService.fillCustomerNameIfEmpty).toHaveBeenCalledWith(
            'cust-42',
            'Lan'
        );
    });

    it('prefers the fetched profile name over event.senderName', async () => {
        adapterMessaging.fetchSenderProfile.mockResolvedValue({
            id: 'sender-fb-1',
            name: 'Alice',
        });

        await processor.process({ ...baseEvent, senderName: 'Lan' });

        expect(conversationService.updateSenderProfile).toHaveBeenCalledWith(
            'conv-existing',
            expect.objectContaining({ senderName: 'Alice' })
        );
    });
});
