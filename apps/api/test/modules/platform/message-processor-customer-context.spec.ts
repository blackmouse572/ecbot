import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

describe('MessageProcessorService — threads customer_id + contact_point_id into the debounced reply job (#174)', () => {
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
        get: jest.fn(() => ({ messaging: adapterMessaging })),
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
            { claim: jest.fn().mockResolvedValue(true) } as any
        );
        processor.onModuleInit();

        accountService.findOne.mockResolvedValue(accountFixture);
        conversationService.recordFallback.mockResolvedValue({
            triggered: false,
            conversation: { id: 'conv-existing' },
        });
        adapterMessaging.fetchSenderProfile.mockResolvedValue({
            id: 'sender-fb-1',
            name: 'Alice',
            avatar: null,
        });
    });

    it('passes the resolved customerId AND contactPoint.id through to the debounced reply job', async () => {
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
            senderName: null,
            senderAvatar: null,
            senderProfileFetchedAt: new Date(), // fresh — skip profile fetch
            contactPoint: { id: 'cp-42' },
            fallbackCount: 0,
        });

        await processor.process(baseEvent);

        expect(messageDebounceService.schedule).toHaveBeenCalledTimes(1);
        // schedule(conversationId, senderId, customerId, contactPointId, text)
        expect(messageDebounceService.schedule).toHaveBeenCalledWith(
            'conv-existing',
            'sender-fb-1',
            'cust-42',
            'cp-42',
            'Hello'
        );
    });

    it('threads the freshly-created customerId on a never-seen sender (created=true path)', async () => {
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-new', customer: { id: 'cust-new' } },
            customerId: 'cust-new',
            created: true,
        });
        conversationService.findOrCreate.mockResolvedValue({
            id: 'conv-new',
            status: ENUM_CONVERSATION_STATUS.OPEN,
            botEnabled: true,
            senderId: 'sender-fb-1',
            senderProfileFetchedAt: new Date(),
            contactPoint: { id: 'cp-new' },
            fallbackCount: 0,
        });

        await processor.process(baseEvent);

        const [, , customerId, contactPointId] =
            messageDebounceService.schedule.mock.calls[0];
        expect(customerId).toBe('cust-new');
        expect(contactPointId).toBe('cp-new');
    });

    describe('POC_EDGE_DEBOUNCE_URL flag ON — routes to the edge Worker instead of BullMQ', () => {
        const originalEnv = process.env.POC_EDGE_DEBOUNCE_URL;
        const originalSecret = process.env.POC_EDGE_INTERNAL_SECRET;
        const originalFetch = global.fetch;

        afterEach(() => {
            if (originalEnv === undefined) {
                delete process.env.POC_EDGE_DEBOUNCE_URL;
            } else {
                process.env.POC_EDGE_DEBOUNCE_URL = originalEnv;
            }
            if (originalSecret === undefined) {
                delete process.env.POC_EDGE_INTERNAL_SECRET;
            } else {
                process.env.POC_EDGE_INTERNAL_SECRET = originalSecret;
            }
            global.fetch = originalFetch;
        });

        it('bumps the generation lease and POSTs the debounce payload to the edge Worker', async () => {
            process.env.POC_EDGE_DEBOUNCE_URL = 'https://edge.test';
            process.env.POC_EDGE_INTERNAL_SECRET = 'top-secret';
            const fetchMock = jest
                .fn()
                .mockResolvedValue({ ok: true } as Response);
            global.fetch = fetchMock as any;

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
                senderName: null,
                senderAvatar: null,
                senderProfileFetchedAt: new Date(), // fresh — skip profile fetch
                contactPoint: { id: 'cp-42' },
                fallbackCount: 0,
            });

            await processor.process(baseEvent);

            expect(messageDebounceService.schedule).not.toHaveBeenCalled();
            expect(lease.bump).toHaveBeenCalledWith('conv-existing');
            expect(fetchMock).toHaveBeenCalledWith(
                'https://edge.test/internal/debounce',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'x-internal-secret': 'top-secret',
                    }),
                    body: JSON.stringify({
                        conversationId: 'conv-existing',
                        senderId: 'sender-fb-1',
                        customerId: 'cust-42',
                        contactPointId: 'cp-42',
                        text: 'Hello',
                    }),
                })
            );
        });
    });
});
