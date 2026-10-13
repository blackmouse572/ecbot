import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_CONVERSATION_STATUS } from '../../../src/modules/conversation/enums/conversation.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

/**
 * History replayed by the reconciliation sweep (#284, ADR-0009) is imported,
 * not answered: the message is stored and the customer's identity refreshed,
 * but nothing that talks to the customer or spends tokens runs.
 */
describe('MessageProcessorService — replayed history', () => {
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
    const replayed: PlatformWebhookEvent = { ...live, replayed: true };

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

    describe('a replayed customer message', () => {
        it('does not schedule reply generation', async () => {
            await processor.process(replayed);

            expect(messageDebounceService.schedule).not.toHaveBeenCalled();
            expect(lease.bump).not.toHaveBeenCalled();
        });

        it('still stores the message and bumps the thread in the inbox', async () => {
            await processor.process(replayed);

            expect(messageRepository.upsertByExternalId).toHaveBeenCalledWith(
                'conv-1',
                'm_1',
                expect.objectContaining({ text: 'is this still available?' })
            );
            expect(conversationService.touchLastMessage).toHaveBeenCalled();
        });

        it('refreshes the customer name and avatar', async () => {
            await processor.process(replayed);

            expect(
                conversationService.updateSenderProfile
            ).toHaveBeenCalledWith(
                'conv-1',
                expect.objectContaining({
                    senderName: 'Lan Nguyen',
                    senderAvatar: 'base64:https://cdn/lan.jpg',
                })
            );
        });

        it('runs no handoff check, typing, read receipt or classifier', async () => {
            await processor.process(replayed);

            expect(
                conversationService.detectHandoffKeywords
            ).not.toHaveBeenCalled();
            expect(adapter.startTyping).not.toHaveBeenCalled();
            expect(adapter.markRead).not.toHaveBeenCalled();
            expect(
                customerTagClassifierService.scheduleAfterMessage
            ).not.toHaveBeenCalled();
        });

        it('does not reopen a resolved conversation', async () => {
            conversation.status = ENUM_CONVERSATION_STATUS.RESOLVED;

            await processor.process(replayed);

            expect(conversationService.updateStatus).not.toHaveBeenCalled();
            expect(chatbotAIService.deleteSession).not.toHaveBeenCalled();
        });

        it('does not dispatch a replayed button press', async () => {
            await processor.process({
                ...replayed,
                action: { id: 'buy', value: 'buy' },
            });

            expect(actionRouter.dispatch).not.toHaveBeenCalled();
        });
    });

    describe('a live customer message', () => {
        it('schedules reply generation', async () => {
            await processor.process(live);

            expect(messageDebounceService.schedule).toHaveBeenCalledTimes(1);
        });

        it('still gets a reply right after an import created the conversation', async () => {
            await processor.process(replayed);
            await processor.process({
                ...live,
                externalMessageId: 'm_2',
                text: 'hello?',
            });

            expect(messageDebounceService.schedule).toHaveBeenCalledTimes(1);
            expect(messageDebounceService.schedule).toHaveBeenCalledWith(
                'conv-1',
                'customer-1',
                'cust-1',
                'cp-1',
                'hello?',
                'msg-row-1'
            );
        });
    });

    describe('sender profile', () => {
        it('does not mark an empty lookup as fetched, so the next event retries', async () => {
            adapter.fetchSenderProfile.mockResolvedValue({ id: 'customer-1' });

            await processor.process(replayed);
            await processor.process({ ...live, externalMessageId: 'm_2' });

            expect(
                conversationService.updateSenderProfile
            ).not.toHaveBeenCalled();
            expect(adapter.fetchSenderProfile).toHaveBeenCalledTimes(2);
        });

        it('keeps a name the webhook itself carried when the lookup has none', async () => {
            adapter.fetchSenderProfile.mockResolvedValue({ id: 'customer-1' });

            await processor.process({ ...replayed, senderName: 'Lan' });

            expect(
                conversationService.updateSenderProfile
            ).toHaveBeenCalledWith(
                'conv-1',
                expect.objectContaining({ senderName: 'Lan' })
            );
        });

        it('is refreshed on the page-first (echo) import path too', async () => {
            await processor.process({
                ...replayed,
                kind: 'echo',
                text: 'Hi, how can we help?',
            });

            expect(adapter.fetchSenderProfile).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'account-1' }),
                'customer-1'
            );
            expect(
                conversationService.updateSenderProfile
            ).toHaveBeenCalledWith(
                'conv-1',
                expect.objectContaining({ senderName: 'Lan Nguyen' })
            );
            expect(
                customerService.fillCustomerNameIfEmpty
            ).toHaveBeenCalledWith('cust-1', 'Lan Nguyen');
        });
    });
});
