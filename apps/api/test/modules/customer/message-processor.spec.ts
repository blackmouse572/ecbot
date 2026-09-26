import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

// fetchAsBase64 reaches out over the network; stub it before importing the service.
jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

describe('MessageProcessorService — Customer + ContactPoint wiring (#172)', () => {
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
    const chatbotAIService = {
        streamChat: jest.fn(),
    };
    const adapterMessaging = {
        sendMessage: jest.fn(),
        fetchSenderProfile: jest.fn(),
        markRead: jest.fn(),
        sendTyping: jest.fn(),
    };
    const registry = {
        // Service calls adapter.fetchSenderProfile / adapter.markRead (flat, top-level)
        // after Task 7 migration. Return adapterMessaging directly so the jest.fn()
        // references used in per-test mockResolvedValue/mockRejectedValue setups are
        // the same objects the service invokes.
        get: jest.fn(() => adapterMessaging),
    };
    // #139: the processor builds the chatbot's tool manifest before streaming.
    const manifestBuilder = {
        build: jest.fn().mockResolvedValue([]),
    };
    const customerService = {
        resolveContactPoint: jest.fn(),
        updateContactPointProfile: jest.fn(),
        fillCustomerNameIfEmpty: jest.fn(),
    };
    // #170: the processor schedules the end-of-conversation tag classifier
    // (fire-and-forget). Stub it so the wiring tests stay focused on
    // Customer/ContactPoint resolution.
    const customerTagClassifierService = {
        scheduleAfterMessage: jest.fn().mockResolvedValue(undefined),
    };
    // The AI reply now runs in a debounced BullMQ job; the processor only
    // schedules it. Stub the scheduler so the wiring tests stay focused.
    const messageDebounceService = {
        schedule: jest.fn().mockResolvedValue(undefined),
    };
    // Reseed-on-resume (#140): deletes the AI session when a RESOLVED
    // conversation re-opens. Not exercised by these Customer-wiring tests.
    const chatbotAIServiceForResume = {
        deleteSession: jest.fn().mockResolvedValue(undefined),
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
            chatbotAIServiceForResume as any,
            {
                bump: jest.fn().mockResolvedValue(1),
                current: jest.fn().mockResolvedValue(0),
                isCurrent: jest.fn().mockResolvedValue(true),
            } as any,
            { claim: jest.fn().mockResolvedValue(true) } as any,
            {} as any
        );
        processor.onModuleInit();

        accountService.findOne.mockResolvedValue(accountFixture);
        // Default: AI stream resolves immediately with no text to keep tests focused
        // on the Customer-resolution path. Each test overrides as needed.
        chatbotAIService.streamChat.mockImplementation(async () => {
            // Return a minimal stream-shaped object the consumeStream helper can drain.
            const handlers: Record<string, ((...args: any[]) => void)[]> = {};
            const stream: any = {
                on(event: string, fn: any) {
                    (handlers[event] ||= []).push(fn);
                    return stream;
                },
            };
            // Fire end on next tick — no data, simulating an empty reply.
            setImmediate(() => handlers['end']?.forEach(fn => fn()));
            return stream;
        });
        // No reply means fallback path triggers; default it to no-handoff.
        conversationService.recordFallback.mockResolvedValue({
            triggered: false,
            conversation: { id: 'conv-new' },
        });
    });

    function freshConversation(overrides: Partial<any> = {}) {
        return {
            id: 'conv-new',
            status: ENUM_CONVERSATION_STATUS.OPEN,
            botEnabled: true,
            senderId: 'sender-fb-1',
            senderName: null,
            senderAvatar: null,
            senderProfileFetchedAt: null,
            contactPoint: null,
            fallbackCount: 0,
            ...overrides,
        };
    }

    describe('first-touch webhook from a never-seen sender', () => {
        it('creates exactly one Customer + ContactPoint and links the new Conversation to that ContactPoint', async () => {
            const newContactPoint = {
                id: 'cp-new',
                customer: { id: 'cust-new' },
            };
            customerService.resolveContactPoint.mockResolvedValue({
                contactPoint: newContactPoint,
                customerId: 'cust-new',
                created: true,
            });
            conversationService.findOrCreate.mockResolvedValue(
                freshConversation({ contactPoint: { id: 'cp-new' } })
            );
            adapterMessaging.fetchSenderProfile.mockResolvedValue({
                id: 'sender-fb-1',
                name: 'Alice',
                avatar: 'https://cdn/avatar.jpg',
            });

            await processor.process(baseEvent);

            expect(customerService.resolveContactPoint).toHaveBeenCalledTimes(
                1
            );
            expect(customerService.resolveContactPoint).toHaveBeenCalledWith({
                workspaceId: 'workspace-1',
                platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                externalSenderId: 'sender-fb-1',
            });
            // The conversation is created with a link to the resolved ContactPoint.
            expect(conversationService.findOrCreate).toHaveBeenCalledWith(
                expect.objectContaining({ contactPointId: 'cp-new' })
            );
        });
    });

    describe('repeated events from the same sender', () => {
        it('reuses the existing ContactPoint + Customer — does not create duplicates', async () => {
            const existingContactPoint = {
                id: 'cp-existing',
                customer: { id: 'cust-existing' },
            };
            customerService.resolveContactPoint.mockResolvedValue({
                contactPoint: existingContactPoint,
                customerId: 'cust-existing',
                created: false,
            });
            conversationService.findOrCreate.mockResolvedValue(
                freshConversation({
                    id: 'conv-existing',
                    contactPoint: { id: 'cp-existing' },
                    senderProfileFetchedAt: new Date(), // fresh profile, skips fetch
                })
            );

            await processor.process(baseEvent);
            await processor.process(baseEvent);

            // resolveContactPoint called twice, but both returns the same existing CP.
            expect(customerService.resolveContactPoint).toHaveBeenCalledTimes(
                2
            );
            // No profile fetch (not stale) — so no fillCustomerNameIfEmpty either.
            expect(
                customerService.fillCustomerNameIfEmpty
            ).not.toHaveBeenCalled();
            expect(
                customerService.updateContactPointProfile
            ).not.toHaveBeenCalled();
        });
    });

    describe('profile fetch on a stale conversation (>7 days)', () => {
        it('writes the fetched profile to BOTH Conversation.senderName AND ContactPoint.displaySenderName — the read-fallback contract', async () => {
            const stalenessWindow = new Date(
                Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago
            );
            customerService.resolveContactPoint.mockResolvedValue({
                contactPoint: { id: 'cp-1', customer: { id: 'cust-1' } },
                customerId: 'cust-1',
                created: false,
            });
            conversationService.findOrCreate.mockResolvedValue(
                freshConversation({
                    id: 'conv-1',
                    senderProfileFetchedAt: stalenessWindow,
                })
            );
            adapterMessaging.fetchSenderProfile.mockResolvedValue({
                id: 'sender-fb-1',
                name: 'Alice Fetched',
                avatar: 'https://cdn/avatar.jpg',
            });

            await processor.process(baseEvent);

            // Old source (conversation) is kept in sync:
            expect(
                conversationService.updateSenderProfile
            ).toHaveBeenCalledWith(
                'conv-1',
                expect.objectContaining({
                    senderName: 'Alice Fetched',
                    senderAvatar: 'base64:https://cdn/avatar.jpg',
                })
            );
            // New source of truth (contact point) is written:
            expect(
                customerService.updateContactPointProfile
            ).toHaveBeenCalledWith(
                'cp-1',
                expect.objectContaining({
                    displaySenderName: 'Alice Fetched',
                    senderAvatar: 'base64:https://cdn/avatar.jpg',
                })
            );
        });

        it('seeds Customer.name only when it is null (fillCustomerNameIfEmpty is invoked unconditionally; the *service* enforces the no-clobber rule)', async () => {
            customerService.resolveContactPoint.mockResolvedValue({
                contactPoint: { id: 'cp-1', customer: { id: 'cust-1' } },
                customerId: 'cust-1',
                created: true,
            });
            conversationService.findOrCreate.mockResolvedValue(
                freshConversation({ senderProfileFetchedAt: null }) // stale (never fetched)
            );
            adapterMessaging.fetchSenderProfile.mockResolvedValue({
                id: 'sender-fb-1',
                name: 'Alice From Platform',
                avatar: null,
            });

            await processor.process(baseEvent);

            // Contract: processor delegates the "is the name empty?" decision to the
            // service. We assert it called fillCustomerNameIfEmpty with the
            // fetched name and customerId.
            expect(
                customerService.fillCustomerNameIfEmpty
            ).toHaveBeenCalledWith('cust-1', 'Alice From Platform');
        });

        it('does not call fillCustomerNameIfEmpty when fetchSenderProfile throws', async () => {
            customerService.resolveContactPoint.mockResolvedValue({
                contactPoint: { id: 'cp-1', customer: { id: 'cust-1' } },
                customerId: 'cust-1',
                created: false,
            });
            conversationService.findOrCreate.mockResolvedValue(
                freshConversation({ senderProfileFetchedAt: null })
            );
            adapterMessaging.fetchSenderProfile.mockRejectedValue(
                new Error('Facebook returned 500')
            );

            await processor.process(baseEvent);

            // None of the profile-derived writes happen on failure.
            expect(
                customerService.updateContactPointProfile
            ).not.toHaveBeenCalled();
            expect(
                customerService.fillCustomerNameIfEmpty
            ).not.toHaveBeenCalled();
            expect(
                conversationService.updateSenderProfile
            ).not.toHaveBeenCalled();
        });
    });

    describe('non-message webhook events', () => {
        it('returns early for non-message events without touching the customer service', async () => {
            await processor.process({
                ...baseEvent,
                kind: 'read',
                text: undefined,
            });

            expect(customerService.resolveContactPoint).not.toHaveBeenCalled();
            expect(conversationService.findOrCreate).not.toHaveBeenCalled();
        });

        it('returns early when the account has no chatbot — no customer is created for an unconfigured page', async () => {
            accountService.findOne.mockResolvedValue({
                ...accountFixture,
                chatbot: null,
            });

            await processor.process(baseEvent);

            expect(customerService.resolveContactPoint).not.toHaveBeenCalled();
        });
    });
});
