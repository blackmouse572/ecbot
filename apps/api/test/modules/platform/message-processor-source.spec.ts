import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

import { HandoffIntentService } from '../../../src/modules/platform/services/handoff-intent.service';
import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';
import { CustomerMarketingService } from '../../../src/modules/customer/services/customer-marketing.service';
import { TrackedLinkAttributionService } from '../../../src/modules/customer/services/tracked-link-attribution.service';

// #503 part 3: a customer arriving through a tracked link gets the source's
// greeting; a message that only opened the chat gets nothing else.
describe('MessageProcessorService tracked link arrival', () => {
    let processor: MessageProcessorService;

    const accountService = { findOne: jest.fn() };
    const conversationService = {
        findOrCreate: jest.fn(),
        updateSenderProfile: jest.fn(),
        touchLastMessage: jest.fn(),
        reopenIfResolved: jest.fn().mockResolvedValue(undefined),
        updateStatus: jest.fn(),
        detectHandoffKeywords: jest.fn(
            (): { keyword: string; source: string } | null => ({
                keyword: 'staff',
                source: 'default',
            })
        ),
        triggerHandoff: jest.fn(),
    };
    const messageRepository = {
        upsertByExternalId: jest.fn(),
    };
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
    const chatbotAIService = {
        deleteSession: jest.fn().mockResolvedValue(undefined),
    };
    const lease = {
        bump: jest.fn().mockResolvedValue(1),
        current: jest.fn().mockResolvedValue(0),
        isCurrent: jest.fn().mockResolvedValue(true),
    };
    const dedupe = {
        claim: jest.fn().mockResolvedValue(true),
        release: jest.fn(),
    };
    const replyGeneration = {
        sendHandoffReply: jest.fn(),
        sendOptOutReply: jest.fn(),
        sendGreeting: jest.fn(),
    };
    const customerMarketing = { recordInbound: jest.fn() };
    const attribution = { recordArrival: jest.fn() };
    const handoffIntent = { wantsPerson: jest.fn() };

    const GREETING = 'Chào bạn, shop tặng mã giảm 10%.';

    const baseEvent: PlatformWebhookEvent = {
        kind: 'message',
        accountKey: 'page-external-1',
        senderId: 'sender-fb-1',
        recipientId: 'page-external-1',
        text: '/start',
        externalMessageId: 'msg-1',
        referral: { code: 'to-roi-tet', source: 'link' },
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
            autoRead: false,
            typingIndicator: true,
            primaryLanguage: 'vi',
        },
    };

    const conversationFixture = {
        id: 'conv-1',
        status: 'OPEN',
        botEnabled: true,
        senderProfileFetchedAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        const mockModuleRef = {
            get: jest.fn((token: unknown) =>
                token === ReplyGenerationService
                    ? replyGeneration
                    : token === HandoffIntentService
                      ? handoffIntent
                      : token === CustomerMarketingService
                        ? customerMarketing
                        : token === TrackedLinkAttributionService
                          ? attribution
                          : conversationService
            ),
        };
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
            dedupe as any,
            {} as any
        );
        processor.onModuleInit();

        accountService.findOne.mockResolvedValue(accountFixture);
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
        });
        conversationService.findOrCreate.mockResolvedValue(conversationFixture);
        conversationService.detectHandoffKeywords.mockReturnValue(null);
        customerMarketing.recordInbound.mockResolvedValue({ optedOut: false });
        messageRepository.upsertByExternalId.mockResolvedValue({ id: 'm-1' });
        attribution.recordArrival.mockResolvedValue({ greeting: GREETING });
    });

    it('greets a customer whose message only opened the chat, without an agent reply', async () => {
        await processor.process(baseEvent);

        expect(attribution.recordArrival).toHaveBeenCalledWith({
            customerId: 'cust-1',
            workspaceId: 'workspace-1',
            code: 'to-roi-tet',
            conversationId: 'conv-1',
            messageId: 'm-1',
        });
        expect(replyGeneration.sendGreeting).toHaveBeenCalledWith(
            accountFixture.chatbot,
            accountFixture,
            'sender-fb-1',
            'conv-1',
            GREETING
        );
        expect(messageDebounceService.schedule).not.toHaveBeenCalled();
    });

    it('greets and then lets the agent answer a real question', async () => {
        await processor.process({
            ...baseEvent,
            text: 'hộp quà giá bao nhiêu',
        });

        expect(replyGeneration.sendGreeting).toHaveBeenCalled();
        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });

    it('logs a reopened chat with no message and greets it', async () => {
        await processor.process({
            ...baseEvent,
            kind: 'referral',
            text: undefined,
            externalMessageId: 'referral:sender-fb-1:1',
        });

        expect(messageRepository.upsertByExternalId).not.toHaveBeenCalled();
        expect(attribution.recordArrival).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'to-roi-tet',
                messageId: undefined,
            })
        );
        expect(replyGeneration.sendGreeting).toHaveBeenCalled();
        expect(messageDebounceService.schedule).not.toHaveBeenCalled();
    });

    it('lets the agent answer as usual when the source has no greeting', async () => {
        attribution.recordArrival.mockResolvedValue({ greeting: null });

        await processor.process(baseEvent);

        expect(replyGeneration.sendGreeting).not.toHaveBeenCalled();
        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });

    it('records the source but stays quiet while staff have the conversation', async () => {
        conversationService.findOrCreate.mockResolvedValue({
            ...conversationFixture,
            botEnabled: false,
        });

        await processor.process(baseEvent);

        expect(attribution.recordArrival).toHaveBeenCalled();
        expect(replyGeneration.sendGreeting).not.toHaveBeenCalled();
    });

    it('answers normally when recording the source fails', async () => {
        attribution.recordArrival.mockRejectedValue(new Error('db down'));

        await processor.process({
            ...baseEvent,
            text: 'hộp quà giá bao nhiêu',
        });

        expect(replyGeneration.sendGreeting).not.toHaveBeenCalled();
        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });

    it('never looks up a message without a code', async () => {
        await processor.process({
            ...baseEvent,
            text: 'hi',
            referral: undefined,
        });

        expect(attribution.recordArrival).not.toHaveBeenCalled();
    });
});
