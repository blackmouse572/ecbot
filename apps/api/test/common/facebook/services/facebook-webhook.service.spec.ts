import { FacebookWebhookService } from '../../../../src/common/facebook/services/facebook-webhook.service';
import { ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE } from '../../../../src/common/enums/facebook.enum';

const configValues: Record<string, any> = {
    'facebook.appId': '1234567890',
    'facebook.appSecret': 'app-secret',
    'facebook.graphApiVersion': 'v20.0',
    'facebook.webhookSecret': 'verify-token',
    'facebook.apiCallbackUrl': 'https://api.example.com/webhooks/facebook',
};

const mockConfig = {
    get: jest.fn((key: string) => configValues[key]),
};

const mockHttp = {
    axiosRef: {
        post: jest.fn().mockResolvedValue({ data: { success: true } }),
    },
};

function buildService() {
    return new FacebookWebhookService(mockConfig as any, mockHttp as any);
}

describe('FacebookWebhookService.registerWebhook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHttp.axiosRef.post.mockResolvedValue({ data: { success: true } });
    });

    // Regression test: the URL used the literal path segment "app" instead
    // of the actual App ID, so Facebook's Graph API returned 404 (no node
    // is aliased to "app" — only the real app-id, like "me" for a user).
    it('posts to the app-id subscriptions endpoint, not a literal "app" path', async () => {
        const service = buildService();

        await service.registerWebhook({
            object: ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE,
            fields: ['messages'],
        });

        expect(mockHttp.axiosRef.post).toHaveBeenCalledWith(
            'https://graph.facebook.com/v20.0/1234567890/subscriptions',
            expect.objectContaining({
                object: ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE,
                fields: 'messages',
            })
        );
    });

    it('returns true when Facebook confirms the subscription', async () => {
        const service = buildService();

        const result = await service.registerWebhook({
            object: ENUM_FACEBOOK_OBJECT_TO_SUBCRIBE.PAGE,
            fields: ['messages'],
        });

        expect(result).toBe(true);
    });
});
