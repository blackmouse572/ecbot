import { ReplyGenerationService } from '@app/modules/platform/services/reply-generation.service';
import {
    HANDOFF_DEFAULT_REPLY,
    HANDOFF_DEFAULT_REPLY_LANGUAGE,
} from '@app/modules/platform/constants/handoff.constant';

describe('ReplyGenerationService.sendHandoffReply', () => {
    const sendMessage = jest.fn();
    const messageRepository = {
        insertPendingOutbound: jest.fn(),
        markOutboundSent: jest.fn(),
        markOutboundFailed: jest.fn(),
    };
    const registry = { get: jest.fn(() => ({ sendMessage })) };
    const service = new ReplyGenerationService(
        {} as any,
        {} as any,
        messageRepository as any,
        registry as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
    );
    const account = { id: 'acc-1', type: 'TELEGRAM' };

    beforeEach(() => {
        jest.clearAllMocks();
        sendMessage.mockResolvedValue({ externalId: 'ext-1' });
    });

    const sentText = () => sendMessage.mock.calls[0][2].content.text;

    it("sends the chatbot's handoff message and stores it as a bot message", async () => {
        await service.sendHandoffReply(
            {
                id: 'bot-1',
                handoffMessage: 'Chị đợi em chút, nhân viên sẽ trả lời ngay ạ.',
                primaryLanguage: 'vi',
            },
            account,
            'sender-1',
            'conv-1'
        );

        expect(sentText()).toBe(
            'Chị đợi em chút, nhân viên sẽ trả lời ngay ạ.'
        );
        expect(messageRepository.insertPendingOutbound).toHaveBeenCalledWith(
            'conv-1',
            expect.any(String),
            expect.objectContaining({
                text: 'Chị đợi em chút, nhân viên sẽ trả lời ngay ạ.',
            })
        );
        expect(messageRepository.markOutboundSent).toHaveBeenCalled();
    });

    it("never leaves the customer hanging: without a handoff message it sends a default in the bot's language", async () => {
        await service.sendHandoffReply(
            { id: 'bot-1', handoffMessage: null, primaryLanguage: 'vi' },
            account,
            'sender-1',
            'conv-1'
        );

        expect(sentText()).toBe(HANDOFF_DEFAULT_REPLY.vi);
    });

    it('falls back to the default language for a bot language without a default', async () => {
        await service.sendHandoffReply(
            { id: 'bot-1', handoffMessage: '', primaryLanguage: 'fr' },
            account,
            'sender-1',
            'conv-1'
        );

        expect(sentText()).toBe(
            HANDOFF_DEFAULT_REPLY[HANDOFF_DEFAULT_REPLY_LANGUAGE]
        );
    });
});
