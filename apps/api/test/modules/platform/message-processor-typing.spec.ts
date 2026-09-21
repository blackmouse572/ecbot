import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

/**
 * The typing indicator used to start inside ReplyGenerationService, i.e. only
 * once the debounce window closed — measured live at ~11.5s after the customer
 * hit send, so the thread sat visibly dead for the whole inbound leg. Starting
 * it at intake costs nothing and cuts the silent gap to the webhook latency.
 */
describe('MessageProcessorService — typing indicator starts at intake', () => {
    let processor: MessageProcessorService;

    const accountService = { findOne: jest.fn() };
    const conversationService = {
        findOrCreate: jest.fn(),
        updateSenderProfile: jest.fn(),
        touchLastMessage: jest.fn(),
        updateStatus: jest.fn(),
        detectHandoffKeywords: jest.fn(() => false),
        triggerHandoff: jest.fn(),
    };
    const messageRepository = { upsertByExternalId: jest.fn() };
    const adapter = {
        fetchSenderProfile: jest.fn(),
        markRead: jest.fn(),
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
    const chatbotAIService = { deleteSession: jest.fn() };
    const lease = {
        bump: jest.fn().mockResolvedValue(1),
        current: jest.fn().mockResolvedValue(0),
        isCurrent: jest.fn().mockResolvedValue(true),
    };
    const dedupe = { claim: jest.fn(), release: jest.fn() };

    const baseEvent: PlatformWebhookEvent = {
        kind: 'message',
        accountKey: 'page-external-1',
        senderId: 'sender-fb-1',
        recipientId: 'page-external-1',
        text: 'Hello',
        externalMessageId: 'msg-typing-1',
        timestamp: new Date('2026-09-08T09:29:30Z'),
        raw: {},
    };

    function buildAccount(typingIndicator: boolean) {
        return {
            id: 'account-1',
            externalId: 'page-external-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            chatbot: {
                id: 'chatbot-1',
                workspace: { id: 'workspace-1' },
                handoffKeywords: [],
                autoRead: false,
                typingIndicator,
            },
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
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
            { get: jest.fn(() => conversationService) } as any,
            chatbotAIService as any,
            lease as any,
            dedupe as any
        );
        processor.onModuleInit();

        dedupe.claim.mockResolvedValue(true);
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
        });
        conversationService.findOrCreate.mockResolvedValue({
            id: 'conv-1',
            status: 'OPEN',
            botEnabled: true,
            senderProfileFetchedAt: new Date(),
        });
    });

    it('sends typing_on at intake, before the debounce window', async () => {
        accountService.findOne.mockResolvedValue(buildAccount(true));

        await processor.process(baseEvent);

        expect(adapter.startTyping).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'account-1' }),
            'sender-fb-1',
            true
        );
    });

    it('stays quiet when the chatbot has the typing indicator off', async () => {
        accountService.findOne.mockResolvedValue(buildAccount(false));

        await processor.process(baseEvent);

        expect(adapter.startTyping).not.toHaveBeenCalled();
    });
});
