import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import {
    ENUM_MESSAGE_AUTHOR,
    ENUM_MESSAGE_DIRECTION,
} from '../../../src/modules/conversation/enums/message.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

/**
 * Echo events carry what the page said — an operator typing in Facebook's Page
 * Inbox, or history replayed by reconcile(). process() used to drop every
 * non-'message' kind, so the page's half of a thread only existed when our own
 * bot had written it at send time.
 */
describe('MessageProcessorService — echo persistence', () => {
    let processor: MessageProcessorService;

    const accountService = { findOne: jest.fn() };
    const conversationService = {
        findOrCreate: jest.fn(),
        touchLastMessage: jest.fn(),
        updateStatus: jest.fn(),
        detectHandoffKeywords: jest.fn(() => false),
    };
    const messageRepository = { upsertByExternalId: jest.fn() };
    const registry = { get: jest.fn(() => ({})) };
    const customerService = { resolveContactPoint: jest.fn() };
    const customerTagClassifierService = {
        scheduleAfterMessage: jest.fn().mockResolvedValue(undefined),
    };
    const messageDebounceService = {
        schedule: jest.fn().mockResolvedValue(undefined),
    };
    const chatbotAIService = { deleteSession: jest.fn() };
    const lease = { bump: jest.fn(), current: jest.fn(), isCurrent: jest.fn() };
    const dedupe = { claim: jest.fn(), release: jest.fn() };

    const echo: PlatformWebhookEvent = {
        kind: 'echo',
        accountKey: 'page-external-1',
        senderId: 'customer-1',
        recipientId: 'page-external-1',
        text: 'let me check that for you',
        externalMessageId: 'm_echo_1',
        timestamp: new Date('2026-09-08T10:01:00Z'),
        raw: {},
    };

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
        accountService.findOne.mockResolvedValue({
            id: 'account-1',
            externalId: 'page-external-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            chatbot: { id: 'chatbot-1', workspace: { id: 'workspace-1' } },
        });
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
        });
        conversationService.findOrCreate.mockResolvedValue({
            id: 'conv-1',
            status: 'OPEN',
            botEnabled: true,
        });
    });

    it('stores the page message as an outbound operator message', async () => {
        await processor.process(echo);

        expect(messageRepository.upsertByExternalId).toHaveBeenCalledWith(
            'conv-1',
            'm_echo_1',
            expect.objectContaining({
                direction: ENUM_MESSAGE_DIRECTION.OUTBOUND,
                authorType: ENUM_MESSAGE_AUTHOR.OPERATOR,
                text: 'let me check that for you',
            })
        );
    });

    it('resolves the conversation by the customer, not the page', async () => {
        await processor.process(echo);

        expect(conversationService.findOrCreate).toHaveBeenCalledWith(
            expect.objectContaining({ senderId: 'customer-1' })
        );
    });

    it('does not trigger a reply — an echo is not a customer turn', async () => {
        await processor.process(echo);

        expect(messageDebounceService.schedule).not.toHaveBeenCalled();
        expect(lease.bump).not.toHaveBeenCalled();
    });

    it('ignores an echo of our own send — the bot already stored it', async () => {
        await processor.process({ ...echo, sentByUs: true });

        expect(messageRepository.upsertByExternalId).not.toHaveBeenCalled();
    });

    it('ignores an echo with no text (attachment-only, nothing to store yet)', async () => {
        await processor.process({ ...echo, text: undefined });

        expect(messageRepository.upsertByExternalId).not.toHaveBeenCalled();
    });
});
