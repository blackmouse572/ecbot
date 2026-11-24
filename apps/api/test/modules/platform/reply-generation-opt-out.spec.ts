import { ReplyGenerationService } from '@app/modules/platform/services/reply-generation.service';

describe('ReplyGenerationService.sendOptOutReply', () => {
    const sendMessage = jest.fn();
    const messageRepository = {
        insertPendingOutbound: jest.fn(),
        markOutboundSent: jest.fn(),
        markOutboundFailed: jest.fn(),
    };
    const registry = { get: jest.fn(() => ({ sendMessage })) };
    const customerMarketing = { stopReplyText: jest.fn() };
    const moduleRef = { get: jest.fn(() => customerMarketing) };
    const service = new ReplyGenerationService(
        {} as any,
        {} as any,
        messageRepository as any,
        registry as any,
        {} as any,
        {} as any,
        moduleRef as any,
        {} as any,
        {} as any,
        {} as any
    );
    const chatbot = {
        id: 'bot-1',
        workspace: { id: 'ws-1' },
        primaryLanguage: 'vi',
    };
    const account = { id: 'acc-1', type: 'TELEGRAM' };

    beforeEach(() => {
        jest.clearAllMocks();
        sendMessage.mockResolvedValue({ externalId: 'ext-1' });
    });

    it("confirms with the shop's text", async () => {
        customerMarketing.stopReplyText.mockResolvedValueOnce(
            'Dạ shop ngưng gửi ạ.'
        );
        await expect(
            service.sendOptOutReply(chatbot, account, 'sender-1', 'conv-1')
        ).resolves.toBe(true);
        expect(sendMessage.mock.calls[0][2].content.text).toBe(
            'Dạ shop ngưng gửi ạ.'
        );
    });

    it('sends nothing when the shop turned the confirmation off', async () => {
        customerMarketing.stopReplyText.mockResolvedValueOnce(null);
        await expect(
            service.sendOptOutReply(chatbot, account, 'sender-1', 'conv-1')
        ).resolves.toBe(false);
        expect(sendMessage).not.toHaveBeenCalled();
        expect(messageRepository.insertPendingOutbound).not.toHaveBeenCalled();
    });
});
