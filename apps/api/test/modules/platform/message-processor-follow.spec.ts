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

// A Zalo OA follow or unfollow goes on the timeline of a customer the shop
// already has. It creates no customer, opens no conversation, sends nothing
// and leaves offers as they are.
describe('MessageProcessorService follow and unfollow', () => {
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
        findCustomerId: jest.fn(),
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
    const customerMarketing = {
        recordInbound: jest.fn(),
        recordFollow: jest.fn(),
    };
    const attribution = { recordArrival: jest.fn() };
    const handoffIntent = { wantsPerson: jest.fn() };

    const baseEvent: PlatformWebhookEvent = {
        kind: 'follow',
        accountKey: 'page-external-1',
        senderId: 'zalo-user-1',
        recipientId: 'page-external-1',
        externalMessageId: 'follow:zalo-user-1:1750000000000',
        timestamp: new Date('2026-06-15T12:00:00Z'),
        raw: {},
    };

    const accountFixture = {
        id: 'account-1',
        externalId: 'page-external-1',
        type: ENUM_ACCOUNT_TYPE.ZALO_PAGE,
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
            {} as any,
            { scheduleCheck: jest.fn().mockResolvedValue(undefined) } as any
        );
        processor.onModuleInit();

        accountService.findOne.mockResolvedValue(accountFixture);
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
        });
        conversationService.findOrCreate.mockResolvedValue(conversationFixture);
    });

    it.each([
        ['follow', true],
        ['unfollow', false],
    ] as const)(
        'logs a %s on the customer the shop already has',
        async (kind, following) => {
            customerService.findCustomerId.mockResolvedValue('cust-1');

            await processor.process({ ...baseEvent, kind });

            expect(customerService.findCustomerId).toHaveBeenCalledWith(
                'workspace-1',
                ENUM_ACCOUNT_TYPE.ZALO_PAGE,
                'zalo-user-1'
            );
            expect(customerMarketing.recordFollow).toHaveBeenCalledWith(
                'cust-1',
                'workspace-1',
                following
            );
            expect(customerService.resolveContactPoint).not.toHaveBeenCalled();
            expect(conversationService.findOrCreate).not.toHaveBeenCalled();
            expect(customerMarketing.recordInbound).not.toHaveBeenCalled();
            expect(messageDebounceService.schedule).not.toHaveBeenCalled();
        }
    );

    it('adds no customer for someone the shop has never talked to', async () => {
        customerService.findCustomerId.mockResolvedValue(null);

        await processor.process(baseEvent);

        expect(customerService.resolveContactPoint).not.toHaveBeenCalled();
        expect(customerMarketing.recordFollow).not.toHaveBeenCalled();
    });
});
