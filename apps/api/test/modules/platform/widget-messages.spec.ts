import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { WidgetPublicController } from '../../../src/modules/platform/controllers/widget.public.controller';

function controllerFor(conversation: Record<string, unknown> | null) {
    const accountService = {
        findOne: jest.fn(async () => ({
            id: 'acc-1',
            type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            config: { allowedOrigins: [] },
            chatbot: { id: 'bot-1' },
        })),
    };
    const conversationRepository = {
        findByChatbotAccountSender: jest.fn(async () => conversation),
    };
    const messageRepository = {
        findAfter: jest.fn(async () => [
            {
                id: 'm1',
                authorType: 'OPERATOR',
                text: 'Chào bạn',
                attachments: [],
                dateSent: new Date('2026-01-01T00:00:00Z'),
            },
        ]),
    };
    const messageMedia = { resolve: jest.fn(async () => []) };
    const none = {} as any;
    return new WidgetPublicController(
        accountService as any,
        conversationRepository as any,
        messageRepository as any,
        none,
        none,
        none,
        none,
        messageMedia as any
    );
}

// #257: the widget kept saying an AI was answering after staff took over.
describe('WidgetPublicController.messages staffActive', () => {
    it('says staff are chatting while the bot is off', async () => {
        const res = await controllerFor({
            id: 'conv-1',
            botEnabled: false,
        }).messages('key', 'visitor-1');
        expect(res._metadata?.staffActive).toBe(true);
        expect(res.data?.[0].authorType).toBe('OPERATOR');
    });

    it('says the agent answers while the bot is on', async () => {
        const res = await controllerFor({
            id: 'conv-1',
            botEnabled: true,
        }).messages('key', 'visitor-1');
        expect(res._metadata?.staffActive).toBe(false);
    });

    it('says nothing about staff before the visitor has a conversation', async () => {
        const res = await controllerFor(null).messages('key', 'visitor-1');
        expect(res.data).toEqual([]);
        expect(res._metadata?.staffActive).toBeFalsy();
    });
});
