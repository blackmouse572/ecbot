import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ENUM_WIDGET_STATUS_CODE_ERROR } from '../../../src/modules/platform/enums/widget.status-code.enum';
import { WidgetPublicController } from '../../../src/modules/platform/controllers/widget.public.controller';

function controllerFor(
    config: Record<string, unknown>,
    chatbot: Record<string, unknown> | null = {}
) {
    const accountService = {
        findOne: jest.fn(async () => ({
            type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            config,
            chatbot: chatbot && { name: 'Shop Helper', ...chatbot },
        })),
    };
    const none = {} as any;
    return new WidgetPublicController(
        accountService as any,
        none,
        none,
        none,
        none,
        none,
        none,
        none
    );
}

// #255: a new widget has no agent until the owner attaches one. Saying so
// lets the widget explain itself instead of calling the key wrong.
describe('WidgetPublicController.meta without an agent', () => {
    it('answers that no agent is attached, not that the key is wrong', async () => {
        await expect(
            controllerFor({ allowedOrigins: [] }, null).meta('key')
        ).rejects.toMatchObject({
            response: {
                statusCode: ENUM_WIDGET_STATUS_CODE_ERROR.NO_CHATBOT_ATTACHED,
                message: 'widget.error.noChatbotAttached',
            },
        });
    });
});

describe('WidgetPublicController.meta privacyPolicyUrl', () => {
    it("returns the business's privacy policy URL when set", async () => {
        const res = await controllerFor({
            allowedOrigins: [],
            privacyPolicyUrl: 'https://shop.example.com/privacy',
        }).meta('key');
        expect(res.data?.privacyPolicyUrl).toBe(
            'https://shop.example.com/privacy'
        );
    });

    it('leaves it out when the business has none', async () => {
        const res = await controllerFor({ allowedOrigins: [] }).meta('key');
        expect(res.data?.privacyPolicyUrl).toBeUndefined();
    });
});

describe('WidgetPublicController.meta welcomeMessage', () => {
    it("keeps the owner's own greeting", async () => {
        const res = await controllerFor(
            { allowedOrigins: [] },
            { welcomeMessage: 'Xin chào!', primaryLanguage: 'en' }
        ).meta('key');
        expect(res.data?.welcomeMessage).toBe('Xin chào!');
    });

    it("greets in the agent's language when the owner set none", async () => {
        const res = await controllerFor(
            { allowedOrigins: [] },
            { primaryLanguage: 'vi' }
        ).meta('key');
        expect(res.data?.welcomeMessage).toBe(
            'Xin chào! Mình có thể giúp gì cho bạn?'
        );
    });

    // #248 review: the chatbot form does not trim, so a greeting of spaces
    // left the widget blank.
    it('treats a greeting of only spaces as unset', async () => {
        const res = await controllerFor(
            { allowedOrigins: [] },
            { welcomeMessage: '   ', primaryLanguage: 'vi' }
        ).meta('key');
        expect(res.data?.welcomeMessage).toBe(
            'Xin chào! Mình có thể giúp gì cho bạn?'
        );
    });

    it('falls back to English for a language without a default', async () => {
        const res = await controllerFor(
            { allowedOrigins: [] },
            { primaryLanguage: 'ja', welcomeMessage: '' }
        ).meta('key');
        expect(res.data?.welcomeMessage).toBe('Hi there! How can I help you?');
    });
});
