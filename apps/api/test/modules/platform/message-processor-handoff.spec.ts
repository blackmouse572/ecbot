import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

import { HandoffIntentService } from '../../../src/modules/platform/services/handoff-intent.service';
import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';

describe('MessageProcessorService keyword handoff', () => {
    let processor: MessageProcessorService;

    const accountService = { findOne: jest.fn() };
    const conversationService = {
        findOrCreate: jest.fn(),
        updateSenderProfile: jest.fn(),
        touchLastMessage: jest.fn(),
        updateStatus: jest.fn(),
        detectHandoffKeywords: jest.fn((): string | null => 'staff'),
        triggerHandoff: jest.fn(),
    };
    const messageRepository = {
        upsertByExternalId: jest.fn(),
    };
    const registry = {
        get: jest.fn(() => ({
            fetchSenderProfile: jest.fn(),
            markRead: jest.fn(),
        })),
    };
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
    const replyGeneration = { sendHandoffReply: jest.fn() };
    const handoffIntent = { wantsPerson: jest.fn() };

    const baseEvent: PlatformWebhookEvent = {
        kind: 'message',
        accountKey: 'page-external-1',
        senderId: 'sender-fb-1',
        recipientId: 'page-external-1',
        text: 'Let me talk to a staff member',
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
        conversationService.detectHandoffKeywords.mockReturnValue('staff');
        handoffIntent.wantsPerson.mockResolvedValue(true);
    });

    it('hands off, then tells the customer a person is coming instead of going silent', async () => {
        await processor.process(baseEvent);

        expect(handoffIntent.wantsPerson).toHaveBeenCalledWith(
            'Let me talk to a staff member',
            'staff'
        );
        expect(conversationService.triggerHandoff).toHaveBeenCalledWith(
            conversationFixture,
            'workspace-1',
            'keyword_trigger',
            'vi'
        );
        expect(replyGeneration.sendHandoffReply).toHaveBeenCalledWith(
            accountFixture.chatbot,
            accountFixture,
            'sender-fb-1',
            'conv-1'
        );
        // No bot turn is scheduled after a handoff.
        expect(messageDebounceService.schedule).not.toHaveBeenCalled();
    });

    // "Shop có hỗ trợ ship COD không?" matched "hỗ trợ" and silenced the bot.
    it('lets the agent answer when the model does not confirm the handoff', async () => {
        handoffIntent.wantsPerson.mockResolvedValue(false);

        await processor.process(baseEvent);

        expect(conversationService.triggerHandoff).not.toHaveBeenCalled();
        expect(replyGeneration.sendHandoffReply).not.toHaveBeenCalled();
        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });

    it('does not ask the model when no keyword matched', async () => {
        conversationService.detectHandoffKeywords.mockReturnValue(null);

        await processor.process(baseEvent);

        expect(handoffIntent.wantsPerson).not.toHaveBeenCalled();
        expect(conversationService.triggerHandoff).not.toHaveBeenCalled();
    });
});
