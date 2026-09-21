import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { ConversationService } from '../../../src/modules/conversation/services/conversation.service';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

// fetch-as-base64 reaches the network — stub it before the processor imports it.
jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

describe('Classifier wiring (#170)', () => {
    describe('ConversationService.updateStatus → scheduleOnResolved', () => {
        let service: ConversationService;

        const conversationRepository = {
            findOneById: jest.fn(),
            updateEntity: jest.fn(),
        };
        const workspaceMemberRepository = {
            findActiveByWorkspace: jest.fn(),
        };
        const notificationService = { create: jest.fn() };
        const chatbotAIService = {
            deleteSession: jest.fn().mockResolvedValue(undefined),
        };
        const conversationReadRepository = {
            upsertRead: jest.fn().mockResolvedValue(undefined),
            getUnreadCounts: jest.fn().mockResolvedValue(new Map()),
        };
        const classifierService = {
            scheduleOnResolved: jest.fn().mockResolvedValue(undefined),
            scheduleAfterMessage: jest.fn().mockResolvedValue(undefined),
        };
        const moduleRef = { get: jest.fn() };

        beforeEach(() => {
            jest.clearAllMocks();
            service = new ConversationService(
                conversationRepository as any,
                workspaceMemberRepository as any,
                notificationService as any,
                chatbotAIService as any,
                conversationReadRepository as any,
                classifierService as any,
                moduleRef as any
            );

            conversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                botEnabled: true,
            });
            conversationRepository.updateEntity.mockImplementation(
                (_filter, patch) => ({
                    id: 'conv-1',
                    ...patch,
                })
            );
        });

        it('fires scheduleOnResolved exactly once when transitioning to RESOLVED', async () => {
            await service.updateStatus(
                'conv-1',
                ENUM_CONVERSATION_STATUS.RESOLVED
            );
            // Fire-and-forget — let the microtask settle.
            await new Promise(r => setImmediate(r));

            expect(classifierService.scheduleOnResolved).toHaveBeenCalledTimes(
                1
            );
            expect(classifierService.scheduleOnResolved).toHaveBeenCalledWith(
                'conv-1'
            );
        });

        it('does NOT fire scheduleOnResolved when transitioning back to OPEN', async () => {
            conversationRepository.findOneById.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.RESOLVED,
                botEnabled: true,
            });

            await service.updateStatus('conv-1', ENUM_CONVERSATION_STATUS.OPEN);
            await new Promise(r => setImmediate(r));

            expect(classifierService.scheduleOnResolved).not.toHaveBeenCalled();
        });

        it('swallows scheduleOnResolved rejection — updateStatus still returns the entity', async () => {
            classifierService.scheduleOnResolved.mockRejectedValueOnce(
                new Error('queue down')
            );

            const result = await service.updateStatus(
                'conv-1',
                ENUM_CONVERSATION_STATUS.RESOLVED
            );
            await new Promise(r => setImmediate(r));

            expect(result).toBeDefined();
            expect(result.status).toBe(ENUM_CONVERSATION_STATUS.RESOLVED);
        });
    });

    describe('MessageProcessorService.process → scheduleAfterMessage', () => {
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
            get: jest.fn(() => ({ messaging: adapterMessaging })),
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
        const classifierService = {
            scheduleAfterMessage: jest.fn().mockResolvedValue(undefined),
            scheduleOnResolved: jest.fn().mockResolvedValue(undefined),
        };
        // The AI reply now runs in a debounced BullMQ job; process() only schedules it.
        const messageDebounceService = {
            schedule: jest.fn().mockResolvedValue(undefined),
        };
        // Reseed-on-resume (#140): deletes the AI session when a RESOLVED
        // conversation re-opens. Not exercised by these classifier-wiring tests.
        const chatbotAIServiceForResume = {
            deleteSession: jest.fn().mockResolvedValue(undefined),
        };

        const baseEvent: PlatformWebhookEvent = {
            kind: 'message',
            accountKey: 'page-1',
            senderId: 'sender-1',
            recipientId: 'page-1',
            text: 'Hi there',
            externalMessageId: 'msg-1',
            timestamp: new Date('2026-06-15T12:00:00Z'),
            raw: {},
        };

        const accountFixture = {
            id: 'account-1',
            externalId: 'page-1',
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
                classifierService as any,
                messageDebounceService as any,
                {} as any, // actionRouter
                mockModuleRef as any,
                chatbotAIServiceForResume as any,
                {
                    bump: jest.fn().mockResolvedValue(1),
                    current: jest.fn().mockResolvedValue(0),
                    isCurrent: jest.fn().mockResolvedValue(true),
                } as any,
                { claim: jest.fn().mockResolvedValue(true) } as any
            );
            processor.onModuleInit();

            accountService.findOne.mockResolvedValue(accountFixture);
            customerService.resolveContactPoint.mockResolvedValue({
                contactPoint: { id: 'cp-1', customer: { id: 'cust-1' } },
                customerId: 'cust-1',
                created: false,
            });
            conversationService.findOrCreate.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                botEnabled: true,
                senderId: 'sender-1',
                senderName: 'Alice',
                senderAvatar: null,
                senderProfileFetchedAt: new Date(), // fresh → skip profile fetch
                contactPoint: { id: 'cp-1' },
                fallbackCount: 0,
            });
            // Empty AI stream so the path completes without exploring fallback.
            chatbotAIService.streamChat.mockImplementation(async () => {
                const handlers: Record<string, ((...args: any[]) => void)[]> =
                    {};
                const stream: any = {
                    on(event: string, fn: any) {
                        (handlers[event] ||= []).push(fn);
                        return stream;
                    },
                };
                setImmediate(() => handlers['end']?.forEach(fn => fn()));
                return stream;
            });
            conversationService.recordFallback.mockResolvedValue({
                triggered: false,
                conversation: { id: 'conv-1' },
            });
        });

        it('fires scheduleAfterMessage after touchLastMessage with the conversation id and a Date', async () => {
            await processor.process(baseEvent);
            await new Promise(r => setImmediate(r));

            expect(conversationService.touchLastMessage).toHaveBeenCalled();
            expect(
                classifierService.scheduleAfterMessage
            ).toHaveBeenCalledTimes(1);
            const [convId, lastAt] =
                classifierService.scheduleAfterMessage.mock.calls[0];
            expect(convId).toBe('conv-1');
            expect(lastAt).toBeInstanceOf(Date);
        });

        it('schedules even when the bot is disabled (debounce should still run)', async () => {
            conversationService.findOrCreate.mockResolvedValue({
                id: 'conv-1',
                status: ENUM_CONVERSATION_STATUS.OPEN,
                botEnabled: false,
                senderId: 'sender-1',
                senderName: 'Alice',
                senderAvatar: null,
                senderProfileFetchedAt: new Date(),
                contactPoint: { id: 'cp-1' },
                fallbackCount: 0,
            });

            await processor.process(baseEvent);
            await new Promise(r => setImmediate(r));

            expect(classifierService.scheduleAfterMessage).toHaveBeenCalledWith(
                'conv-1',
                expect.any(Date)
            );
        });

        it('does not schedule for non-message events', async () => {
            await processor.process({
                ...baseEvent,
                kind: 'read',
                text: undefined,
            });

            expect(
                classifierService.scheduleAfterMessage
            ).not.toHaveBeenCalled();
        });

        it('swallows scheduleAfterMessage rejection — the processor still completes', async () => {
            classifierService.scheduleAfterMessage.mockRejectedValueOnce(
                new Error('queue offline')
            );

            await expect(processor.process(baseEvent)).resolves.not.toThrow();
            await new Promise(r => setImmediate(r));
        });
    });
});
