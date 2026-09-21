import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

/**
 * Candidate 1 (architecture review 2026-08-06): one shared dedupe seam at
 * the top of process(), covering both the edge-forwarded and direct-to-api
 * ingress paths — a platform redelivery of the same message must be a no-op.
 */
describe('MessageProcessorService — inbound event dedupe (candidate 1)', () => {
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
    const dedupe = { claim: jest.fn(), release: jest.fn() };

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
            autoRead: false,
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
            dedupe as any
        );
        processor.onModuleInit();

        accountService.findOne.mockResolvedValue(accountFixture);
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
        });
        conversationService.findOrCreate.mockResolvedValue(conversationFixture);
    });

    it('claims dedupe with the account platform type + externalMessageId, then proceeds when claimed', async () => {
        dedupe.claim.mockResolvedValue(true);

        await processor.process(baseEvent);

        expect(dedupe.claim).toHaveBeenCalledWith(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            'msg-1'
        );
        expect(customerService.resolveContactPoint).toHaveBeenCalledTimes(1);
        expect(messageRepository.upsertByExternalId).toHaveBeenCalledTimes(1);
    });

    it('is a no-op — skips all side effects — when the claim is refused (redelivery)', async () => {
        dedupe.claim.mockResolvedValue(false);

        await processor.process(baseEvent);

        expect(customerService.resolveContactPoint).not.toHaveBeenCalled();
        expect(conversationService.findOrCreate).not.toHaveBeenCalled();
        expect(messageRepository.upsertByExternalId).not.toHaveBeenCalled();
        expect(messageDebounceService.schedule).not.toHaveBeenCalled();
        expect(lease.bump).not.toHaveBeenCalled();
    });

    // The claim marks "this turn ran". A turn that throws must release
    // it, or the BullMQ retry sees a redelivery and drops the message forever.
    it('releases the claim when the turn throws, so the retry reruns it', async () => {
        dedupe.claim.mockResolvedValue(true);
        conversationService.findOrCreate.mockRejectedValue(
            new Error('duplicate key value violates unique constraint')
        );

        await expect(processor.process(baseEvent)).rejects.toThrow(
            'duplicate key value violates unique constraint'
        );

        expect(dedupe.release).toHaveBeenCalledWith(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            'msg-1'
        );
    });

    it('skips the dedupe check entirely for events without externalMessageId (e.g. some action events)', async () => {
        await processor.process({
            ...baseEvent,
            externalMessageId: undefined,
            action: { id: 'action-1', value: 'yes' },
        });

        expect(dedupe.claim).not.toHaveBeenCalled();
    });
});
