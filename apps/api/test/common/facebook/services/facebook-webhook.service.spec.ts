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

describe('FacebookWebhookService.subscribePageWebhook', () => {
    const pages = Array.from({ length: 25 }, (_, i) => ({
        id: `p${i}`,
        access_token: `t${i}`,
    }));

    beforeEach(() => jest.clearAllMocks());

    it('subscribes Pages concurrently, not one at a time', async () => {
        let inFlight = 0;
        let peak = 0;
        mockHttp.axiosRef.post.mockImplementation(async () => {
            inFlight++;
            peak = Math.max(peak, inFlight);
            await new Promise(r => setTimeout(r, 1));
            inFlight--;
            return { data: { success: true } };
        });

        const ok = await buildService().subscribePageWebhook(pages as any, [
            'messages',
        ]);

        expect(ok).toBe(true);
        expect(mockHttp.axiosRef.post).toHaveBeenCalledTimes(25);
        expect(peak).toBe(10);
    });

    it('returns false when a Page in the first batch fails', async () => {
        mockHttp.axiosRef.post.mockImplementation(async (url: string) => {
            if (url.includes('/p3/')) throw new Error('stale token');
            return { data: { success: true } };
        });

        const ok = await buildService().subscribePageWebhook(pages as any, [
            'messages',
        ]);

        expect(ok).toBe(false);
    });

    it('stops before later batches once a Page in a middle batch fails', async () => {
        mockHttp.axiosRef.post.mockImplementation(async (url: string) => {
            if (url.includes('/p13/')) throw new Error('stale token');
            return { data: { success: true } };
        });

        const ok = await buildService().subscribePageWebhook(pages as any, [
            'messages',
        ]);

        expect(ok).toBe(false);
        expect(mockHttp.axiosRef.post).toHaveBeenCalledTimes(20);
        expect(mockHttp.axiosRef.post).not.toHaveBeenCalledWith(
            expect.stringContaining('/p20/'),
            expect.anything(),
            expect.anything()
        );
    });

    it('returns false when a Page in the last partial batch fails', async () => {
        mockHttp.axiosRef.post.mockImplementation(async (url: string) => {
            if (url.includes('/p24/')) throw new Error('stale token');
            return { data: { success: true } };
        });

        const ok = await buildService().subscribePageWebhook(pages as any, [
            'messages',
        ]);

        expect(ok).toBe(false);
    });
});
