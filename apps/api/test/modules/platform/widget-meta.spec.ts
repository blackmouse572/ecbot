import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { WidgetPublicController } from '../../../src/modules/platform/controllers/widget.public.controller';

function controllerFor(config: Record<string, unknown>) {
    const accountService = {
        findOne: jest.fn(async () => ({
            type: ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET,
            config,
            chatbot: { name: 'Shop Helper' },
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
