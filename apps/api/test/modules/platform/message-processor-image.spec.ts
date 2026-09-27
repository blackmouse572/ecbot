import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformWebhookEvent } from '../../../src/modules/platform/interfaces/platform-adapter.interface';

jest.mock('../../../src/common/utils/fetch-as-base64.util', () => ({
    fetchAsBase64: jest.fn(async (url: string) => `base64:${url}`),
}));

describe('MessageProcessorService — inbound images', () => {
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
    const messageRepository = { upsertByExternalId: jest.fn() };
    const adapter = {
        fetchSenderProfile: jest.fn(),
        markRead: jest.fn(),
        startTyping: jest.fn().mockResolvedValue(undefined),
        fetchMedia: jest.fn(),
    };
    const messageMedia = { saveImage: jest.fn() };
    const JPEG = { data: Buffer.from('jpg'), mime: 'image/jpeg' };
    const stored = { type: 'image', key: 'conversations/conv-1/a.jpg' };
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
    const chatbotAIService = { deleteSession: jest.fn() };
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
        externalMessageId: 'msg-image-1',
        timestamp: new Date('2026-09-08T09:29:30Z'),
        raw: {},
    };

    const image = { type: 'image' as const, url: 'https://cdn/shirt.jpg' };

    function buildAccount(typingIndicator = false) {
        return {
            id: 'account-1',
            externalId: 'page-external-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            chatbot: {
                id: 'chatbot-1',
                workspace: { id: 'workspace-1' },
                handoffKeywords: [],
                autoRead: false,
                typingIndicator,
            },
        };
    }

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
            dedupe as any,
            messageMedia as any
        );
        processor.onModuleInit();
        accountService.findOne.mockResolvedValue(buildAccount());

        dedupe.claim.mockResolvedValue(true);
        adapter.fetchMedia.mockResolvedValue(JPEG);
        messageMedia.saveImage.mockResolvedValue(stored);
        customerService.resolveContactPoint.mockResolvedValue({
            contactPoint: { id: 'cp-1' },
            customerId: 'cust-1',
        });
        conversationService.findOrCreate.mockResolvedValue({
            id: 'conv-1',
            status: 'OPEN',
            botEnabled: true,
            senderProfileFetchedAt: new Date(),
        });
    });

    it('keeps an image-only message: stored privately and replied to', async () => {
        await processor.process({
            ...baseEvent,
            text: undefined,
            attachments: [image],
        });

        expect(adapter.fetchMedia).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'account-1' }),
            image
        );
        expect(messageMedia.saveImage).toHaveBeenCalledWith('conv-1', JPEG);
        expect(messageRepository.upsertByExternalId).toHaveBeenCalledWith(
            'conv-1',
            'msg-image-1',
            expect.objectContaining({ text: '', attachments: [stored] })
        );
        expect(messageDebounceService.schedule).toHaveBeenCalled();
    });

    it('accepts a Telegram-style image that only carries a file id', async () => {
        await processor.process({
            ...baseEvent,
            text: undefined,
            attachments: [{ type: 'image', raw: { file_id: 'F1' } }],
        });

        expect(messageRepository.upsertByExternalId).toHaveBeenCalledWith(
            'conv-1',
            'msg-image-1',
            expect.objectContaining({ attachments: [stored] })
        );
    });

    it('keeps the platform link when the download fails', async () => {
        adapter.fetchMedia.mockRejectedValueOnce(new Error('403'));

        await processor.process({ ...baseEvent, attachments: [image] });

        expect(messageRepository.upsertByExternalId).toHaveBeenCalledWith(
            'conv-1',
            'msg-image-1',
            expect.objectContaining({ text: 'Hello', attachments: [image] })
        );
    });

    it('does not store a download that is not an image', async () => {
        adapter.fetchMedia.mockResolvedValueOnce({
            data: Buffer.from('<html>'),
            mime: 'text/html',
        });

        await processor.process({ ...baseEvent, attachments: [image] });

        expect(messageMedia.saveImage).not.toHaveBeenCalled();
    });

    it('still skips a message with no text and no image', async () => {
        await processor.process({
            ...baseEvent,
            text: undefined,
            attachments: [{ type: 'audio', url: 'https://cdn/a.mp3' }],
        });

        expect(accountService.findOne).not.toHaveBeenCalled();
        expect(messageDebounceService.schedule).not.toHaveBeenCalled();
    });
});
