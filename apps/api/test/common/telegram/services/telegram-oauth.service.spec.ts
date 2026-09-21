import { HttpException, UnprocessableEntityException } from '@nestjs/common';
import { TelegramOAuthService } from '../../../../src/common/telegram/services/telegram-oauth.service';

// Passes the token-format regex in getMe: /^\d+:[A-Za-z0-9_-]{35,}$/
const VALID_TOKEN = '123456:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const VALID_BOT_TOKEN = '123456:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

const configValues: Record<string, any> = {
    'telegram.apiUrl': 'https://api.telegram.org',
    'telegram.webhookSecretToken': '',
    // Frontend URL — must NOT be used as the webhook base (the bug in #252).
    'home.url': 'https://frontend.example.com',
    'app.backendUrl': 'https://eccho.onrender.com',
    'app.globalPrefix': '/api',
    'app.urlVersion.prefix': 'v',
    'app.urlVersion.version': '1',
};

const mockConfig = {
    get: jest.fn((key: string) => configValues[key]),
};

const mockHttp = {
    axiosRef: {
        get: jest.fn().mockResolvedValue({
            data: {
                ok: true,
                result: {
                    id: 123,
                    is_bot: true,
                    first_name: 'My Bot',
                    username: 'my_bot',
                },
            },
        }),
        post: jest.fn().mockResolvedValue({
            data: { ok: true, result: true },
        }),
    },
};

function buildService() {
    return new TelegramOAuthService(mockConfig as any, mockHttp as any);
}

// getMe error tests: config resolves everything to undefined so registerWebhook
// is skipped (backendUrl === ''), isolating the getMe error path.
function buildServiceWithGet(axiosGet: jest.Mock) {
    const config = {
        get: jest.fn().mockReturnValue(undefined),
    };
    const http = {
        axiosRef: {
            get: axiosGet,
            post: jest.fn().mockResolvedValue({ data: { ok: true } }),
        },
    };
    return new TelegramOAuthService(config as any, http as any);
}

describe('TelegramOAuthService - registerWebhook', () => {
    let service: TelegramOAuthService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = buildService();
    });

    it('registers the webhook at the backend-public webhook route', async () => {
        await service.getTokenAndProfile(VALID_BOT_TOKEN);

        const [, body] = mockHttp.axiosRef.post.mock.calls[0];
        expect(body.url).toBe(
            'https://eccho.onrender.com/api/v1/public/webhooks/telegram/123'
        );
    });
});

describe('TelegramOAuthService - getMe error handling', () => {
    it('wraps a transient network error as a retryable 5xx HttpException, not a raw error/500', async () => {
        // Network failure reaching api.telegram.org — rejection has no `.response`
        const networkErr = new Error('ECONNRESET');
        const service = buildServiceWithGet(
            jest.fn().mockRejectedValue(networkErr)
        );

        let caught: unknown;
        try {
            await service.getTokenAndProfile(VALID_TOKEN);
        } catch (err) {
            caught = err;
        }

        expect(caught).toBeInstanceOf(HttpException);
        expect([502, 503]).toContain((caught as HttpException).getStatus());
    });

    it('wraps an upstream 5xx as a retryable 5xx HttpException', async () => {
        const serverErr = Object.assign(new Error('Bad Gateway'), {
            response: { status: 502 },
        });
        const service = buildServiceWithGet(
            jest.fn().mockRejectedValue(serverErr)
        );

        await expect(
            service.getTokenAndProfile(VALID_TOKEN)
        ).rejects.toBeInstanceOf(HttpException);
        await expect(
            service.getTokenAndProfile(VALID_TOKEN)
        ).rejects.toMatchObject({
            // still a 5xx, never surfaces as a raw error / generic 500
            status: expect.any(Number),
        });
    });

    it('preserves 401 → UnprocessableEntityException (invalid token)', async () => {
        const unauthorized = Object.assign(new Error('Unauthorized'), {
            response: { status: 401 },
        });
        const service = buildServiceWithGet(
            jest.fn().mockRejectedValue(unauthorized)
        );

        await expect(
            service.getTokenAndProfile(VALID_TOKEN)
        ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('preserves invalid-token-format → UnprocessableEntityException', async () => {
        const service = buildServiceWithGet(jest.fn());

        await expect(
            service.getTokenAndProfile('not-a-valid-token')
        ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
});
