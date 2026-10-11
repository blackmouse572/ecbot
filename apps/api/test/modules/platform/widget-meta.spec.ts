import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { WidgetPublicController } from '../../../src/modules/platform/controllers/widget.public.controller';

function controllerFor(
    config: Record<string, unknown>,
    chatbot: Record<string, unknown> = {}
) {
    const accountService = {
        findOne: jest.fn(async () => ({
            type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            config,
            chatbot: { name: 'Shop Helper', ...chatbot },
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

    it('falls back to English for a language without a default', async () => {
        const res = await controllerFor(
            { allowedOrigins: [] },
            { primaryLanguage: 'ja', welcomeMessage: '' }
        ).meta('key');
        expect(res.data?.welcomeMessage).toBe('Hi there! How can I help you?');
    });
});
