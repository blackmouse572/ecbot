import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

import { HandoffIntentService } from '../../../src/modules/platform/services/handoff-intent.service';
import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';
import { CustomerMarketingService } from '../../../src/modules/customer/services/customer-marketing.service';

describe('MessageProcessorService marketing opt-out', () => {
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
    };
    const customerMarketing = { recordInbound: jest.fn() };
    const handoffIntent = { wantsPerson: jest.fn() };

    const baseEvent: PlatformWebhookEvent = {
        kind: 'message',
        accountKey: 'page-external-1',
        senderId: 'sender-fb-1',
        recipientId: 'page-external-1',
        text: 'Dừng',
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
        customerMarketing.recordInbound.mockResolvedValue({ optedOut: true });
    });

    it('records the message on the customer and confirms the opt-out instead of an agent reply', async () => {
        messageRepository.upsertByExternalId.mockResolvedValue({ id: 'm-1' });

        await processor.process(baseEvent);

        expect(customerMarketing.recordInbound).toHaveBeenCalledWith({
            customerId: 'cust-1',
            workspaceId: 'workspace-1',
            text: 'Dừng',
            conversationId: 'conv-1',
            messageId: 'm-1',
        });
        expect(replyGeneration.sendOptOutReply).toHaveBeenCalledWith(
            accountFixture.chatbot,
            accountFixture,
            'sender-fb-1',
            'conv-1'
        );
        expect(messageDebounceService.schedule).not.toHaveBeenCalled();
    });

    it('lets the agent answer every other message', async () => {
        customerMarketing.recordInbound.mockResolvedValue({ optedOut: false });

        await processor.process({ ...baseEvent, text: 'còn hàng không' });

        expect(replyGeneration.sendOptOutReply).not.toHaveBeenCalled();
        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });

    it('still answers when recording fails', async () => {
        customerMarketing.recordInbound.mockRejectedValue(new Error('db down'));

        await processor.process(baseEvent);

        expect(replyGeneration.sendOptOutReply).not.toHaveBeenCalled();
        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });

    it('records the opt-out but stays quiet while staff have the conversation', async () => {
        conversationService.findOrCreate.mockResolvedValue({
            ...conversationFixture,
            botEnabled: false,
        });

        await processor.process(baseEvent);

        expect(customerMarketing.recordInbound).toHaveBeenCalled();
        expect(replyGeneration.sendOptOutReply).not.toHaveBeenCalled();
    });

    it('ignores replayed history', async () => {
        await processor.process({ ...baseEvent, replayed: true });

        expect(customerMarketing.recordInbound).not.toHaveBeenCalled();
    });
});
