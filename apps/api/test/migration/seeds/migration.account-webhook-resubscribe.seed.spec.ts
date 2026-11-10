import { ENUM_ACCOUNT_TYPE } from 'src/modules/account/enums/account.enum';
import { MigrationAccountWebhookResubscribeSeed } from 'src/migration/seeds/migration.account-webhook-resubscribe.seed';

// #503: Pages and Instagram accounts connected before referral fields were
// added keep their old subscription until they are subscribed again.
describe('MigrationAccountWebhookResubscribeSeed', () => {
    const accounts = [
        {
            externalId: 'PAGE-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            accessToken: 'enc-page',
        },
        {
            externalId: 'IG-1',
            type: ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
            accessToken: 'enc-ig',
        },
    ];
    const accountRepository = { find: jest.fn(async () => accounts) };
    const helperEncryption = {
        envelopeDecrypt: jest.fn((v: string) => `plain-${v}`),
    };
    const facebookWebhookService = {
        subscribePageWebhook: jest.fn(async () => true),
    };
    const instagramOAuthService = {
        subscribeWebhooks: jest.fn(async () => undefined),
    };
    const em = { fork: jest.fn(() => ({})) };

    const seed = () =>
        new MigrationAccountWebhookResubscribeSeed(
            em as any,
            accountRepository as any,
            helperEncryption as any,
            facebookWebhookService as any,
            instagramOAuthService as any
        );

    beforeEach(() => jest.clearAllMocks());

    it('subscribes each Page with messaging_referrals and each Instagram account again', async () => {
        const counts = await seed().resubscribe();

        expect(
            facebookWebhookService.subscribePageWebhook
        ).toHaveBeenCalledWith(
            [{ id: 'PAGE-1', access_token: 'plain-enc-page' }],
            expect.arrayContaining(['messaging_referrals'])
        );
        expect(instagramOAuthService.subscribeWebhooks).toHaveBeenCalledWith(
            'plain-enc-ig'
        );
        expect(counts).toEqual({ subscribed: 2, failed: 0 });
    });

    it('counts a failure and carries on with the rest', async () => {
        facebookWebhookService.subscribePageWebhook.mockResolvedValueOnce(
            false
        );

        const counts = await seed().resubscribe();

        expect(instagramOAuthService.subscribeWebhooks).toHaveBeenCalled();
        expect(counts).toEqual({ subscribed: 1, failed: 1 });
    });
});
