import {
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { WhatsAppOAuthService } from '../../../../src/common/whatsapp/services/whatsapp-oauth.service';

const config = {
    get: jest.fn(
        (k: string) =>
            ({
                'facebook.appId': 'APP',
                'facebook.appSecret': 'SECRET',
                'facebook.redirectUri':
                    'https://app.test/auth/facebook/callback',
            })[k]
    ),
};

function buildService(get: jest.Mock, post: jest.Mock = jest.fn()) {
    return new WhatsAppOAuthService(
        config as any,
        { axiosRef: { get, post } } as any
    );
}

const phoneNumber = {
    data: {
        id: '1055',
        display_phone_number: '+84 90 123 4567',
        verified_name: 'Shop Lan',
    },
};

describe('WhatsAppOAuthService.getTokenAndProfile — manual credential', () => {
    /**
     * Graph GETs routed by URL: the number itself, debug_token listing the two
     * WABAs the token can manage, and their numbers — 1055 lives in WABA 777.
     */
    const graphGet = (overrides: Record<string, () => Promise<unknown>> = {}) =>
        jest.fn((url: string, _opts?: any) => {
            const key = Object.keys(overrides).find(k => url.endsWith(k));
            if (key) return overrides[key]();
            if (url.endsWith('/1055')) return Promise.resolve(phoneNumber);
            if (url.endsWith('/debug_token'))
                return Promise.resolve({
                    data: {
                        data: {
                            app_id: 'APP',
                            granular_scopes: [
                                {
                                    scope: 'whatsapp_business_management',
                                    target_ids: ['999', '777'],
                                },
                            ],
                        },
                    },
                });
            if (url.endsWith('/999/phone_numbers'))
                return Promise.resolve({ data: { data: [] } });
            if (url.endsWith('/777/phone_numbers'))
                return Promise.resolve({ data: { data: [phoneNumber.data] } });
            return Promise.reject(new Error(`unexpected GET ${url}`));
        });

    const ok = () => jest.fn().mockResolvedValue({ data: { success: true } });

    it('validates the credential against the phone number and returns its profile', async () => {
        const get = graphGet();

        const result = await buildService(get, ok()).getTokenAndProfile(
            '1055:EAAtoken'
        );

        expect(result).toEqual({
            accessToken: 'EAAtoken',
            externalId: '1055',
            name: 'Shop Lan',
            link: 'https://wa.me/84901234567',
        });
        const [url, opts] = get.mock.calls[0];
        expect(url).toMatch(/\/v\d+\.\d+\/1055$/);
        expect(opts.headers.Authorization).toBe('Bearer EAAtoken');
    });

    // Without it Meta delivers no messages for the number (the dashboard
    // webhook alone is not enough) — the signup path subscribes too.
    it('subscribes the app to the WABA that owns the number', async () => {
        const post = ok();

        await buildService(graphGet(), post).getTokenAndProfile(
            '1055:EAAtoken'
        );

        expect(post).toHaveBeenCalledTimes(1);
        const [url, , opts] = post.mock.calls[0];
        expect(url).toMatch(/\/777\/subscribed_apps$/);
        expect(opts.headers.Authorization).toBe('Bearer EAAtoken');
    });

    // subscribed_apps subscribes the app that issued the token, so a token
    // from the customer's own Meta app would "link" a number whose messages
    // go to that other app — a silently dead channel.
    it('rejects a token issued by a different Meta app, before subscribing', async () => {
        const get = graphGet({
            '/debug_token': () =>
                Promise.resolve({
                    data: {
                        data: {
                            app_id: 'OTHER_APP',
                            granular_scopes: [
                                {
                                    scope: 'whatsapp_business_management',
                                    target_ids: ['777'],
                                },
                            ],
                        },
                    },
                }),
        });
        const post = ok();

        await expect(
            buildService(get, post).getTokenAndProfile('1055:EAAtoken')
        ).rejects.toMatchObject({
            response: { message: 'whatsapp.error.foreignApp' },
        });
        expect(post).not.toHaveBeenCalled();
    });

    it('fails with wabaAccess when no WABA the token manages holds the number', async () => {
        const get = graphGet({
            '/777/phone_numbers': () => Promise.resolve({ data: { data: [] } }),
        });

        await expect(
            buildService(get, ok()).getTokenAndProfile('1055:EAAtoken')
        ).rejects.toMatchObject({
            response: { message: 'whatsapp.error.wabaAccess' },
        });
    });

    it('fails with wabaAccess when the subscription is refused', async () => {
        const post = jest
            .fn()
            .mockRejectedValue({ response: { status: 403, data: {} } });

        await expect(
            buildService(graphGet(), post).getTokenAndProfile('1055:EAAtoken')
        ).rejects.toMatchObject({
            response: { message: 'whatsapp.error.wabaAccess' },
        });
    });

    it.each(['abc:EAAtoken', '1055:', ':EAAtoken'])(
        'rejects a malformed credential %p without calling Graph',
        async code => {
            const get = jest.fn();
            await expect(
                buildService(get).getTokenAndProfile(code)
            ).rejects.toBeInstanceOf(UnprocessableEntityException);
            expect(get).not.toHaveBeenCalled();
        }
    );

    it('maps a Graph 4xx to an invalid-credential 422', async () => {
        const get = jest
            .fn()
            .mockRejectedValue({ response: { status: 401, data: {} } });
        await expect(
            buildService(get).getTokenAndProfile('1055:bad')
        ).rejects.toMatchObject({
            response: { message: 'whatsapp.error.invalidCredential' },
        });
    });

    it('maps a network failure to a retryable 503', async () => {
        const get = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
        await expect(
            buildService(get).getTokenAndProfile('1055:EAAtoken')
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
});

describe('WhatsAppOAuthService.refreshCredentials', () => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(0)));
    afterEach(() => jest.useRealTimers());

    it('exchanges the expiring token for a fresh 60-day one', async () => {
        const get = jest.fn().mockResolvedValue({
            data: { access_token: 'NEW', expires_in: 5184000 },
        });

        const result = await buildService(get).refreshCredentials('OLD');

        expect(result.accessToken).toBe('NEW');
        expect(result.tokenExpiresAt).toEqual(new Date(5184000 * 1000));
        const [url, opts] = get.mock.calls[0];
        expect(url).toMatch(/\/oauth\/access_token$/);
        expect(opts.params).toEqual({
            grant_type: 'fb_exchange_token',
            client_id: 'APP',
            client_secret: 'SECRET',
            set_token_expires_in_60_days: true,
            fb_exchange_token: 'OLD',
        });
    });

    // The scheduler blocks the account and emails the owner on a throw.
    it('throws when Meta refuses the refresh, so the account gets blocked', async () => {
        const get = jest
            .fn()
            .mockRejectedValue({ response: { status: 400, data: {} } });

        await expect(
            buildService(get).refreshCredentials('OLD')
        ).rejects.toBeDefined();
    });
});

// The Meta-hosted signup redirects back with only a code, so the backend
// finds what was shared: the WABA via debug_token, then its numbers.
describe('WhatsAppOAuthService.getTokenAndProfile — Embedded Signup (redirect)', () => {
    const numbers = [
        {
            id: '1055',
            display_phone_number: '+84 90 123 4567',
            verified_name: 'Shop Lan',
        },
        {
            id: '2066',
            display_phone_number: '+84 91 000 0000',
            verified_name: 'Shop Lan 2',
        },
    ];

    /** Graph GETs routed by URL, so a test only overrides what it cares about. */
    const graphGet = (overrides: Record<string, () => Promise<unknown>> = {}) =>
        jest.fn((url: string, _opts?: any) => {
            const key = Object.keys(overrides).find(k => url.endsWith(k));
            if (key) return overrides[key]();
            if (url.endsWith('/oauth/access_token'))
                return Promise.resolve({
                    data: { access_token: 'BIZ', expires_in: 5184000 },
                });
            if (url.endsWith('/debug_token'))
                return Promise.resolve({
                    data: {
                        data: {
                            granular_scopes: [
                                {
                                    scope: 'whatsapp_business_messaging',
                                    target_ids: ['777'],
                                },
                                {
                                    scope: 'whatsapp_business_management',
                                    target_ids: ['777', '666'],
                                },
                            ],
                        },
                    },
                });
            if (url.endsWith('/777/phone_numbers'))
                return Promise.resolve({ data: { data: numbers } });
            return Promise.reject(new Error(`unexpected GET ${url}`));
        });

    const ok = () => jest.fn().mockResolvedValue({ data: { success: true } });

    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(0)));
    afterEach(() => jest.useRealTimers());

    it('exchanges the code with the redirect URI the popup used', async () => {
        const get = graphGet();
        await buildService(get, ok()).getTokenAndProfile('AQBcode');

        const [, opts] = get.mock.calls.find(([u]) =>
            u.endsWith('/oauth/access_token')
        );
        expect(opts.params).toEqual({
            client_id: 'APP',
            client_secret: 'SECRET',
            redirect_uri: 'https://app.test/auth/facebook/callback',
            code: 'AQBcode',
        });
    });

    it('finds the newest shared WABA via debug_token using the app token', async () => {
        const get = graphGet();
        const post = ok();
        await buildService(get, post).getTokenAndProfile('AQBcode');

        const [, opts] = get.mock.calls.find(([u]) =>
            u.endsWith('/debug_token')
        );
        expect(opts.params).toEqual({
            input_token: 'BIZ',
            access_token: 'APP|SECRET',
        });
        const [subscribeUrl, , subscribeOpts] = post.mock.calls[0];
        expect(subscribeUrl).toMatch(/\/777\/subscribed_apps$/);
        expect(subscribeOpts.headers.Authorization).toBe('Bearer BIZ');
    });

    it('links every number of the WABA, registering each', async () => {
        const post = ok();
        const result = await buildService(graphGet(), post).getTokenAndProfile(
            'AQBcode'
        );

        const expiry = new Date(5184000 * 1000);
        expect(result).toEqual({
            accessToken: 'BIZ',
            tokenExpiresAt: expiry,
            externalId: '1055',
            name: 'Shop Lan',
            link: 'https://wa.me/84901234567',
            additionalAccounts: [
                {
                    accessToken: 'BIZ',
                    tokenExpiresAt: expiry,
                    externalId: '2066',
                    name: 'Shop Lan 2',
                    link: 'https://wa.me/84910000000',
                },
            ],
        });
        const registered = post.mock.calls
            .filter(([u]) => u.endsWith('/register'))
            .map(([u, body]) => [u.split('/').at(-2), body.pin]);
        expect(registered.map(([id]) => id)).toEqual(['1055', '2066']);
        registered.forEach(([, pin]) => expect(pin).toMatch(/^\d{6}$/));
    });

    // Registering sets a two-step PIN when none is set; a number already on
    // Cloud API (possibly used by another integration) must be left alone.
    it('registers only numbers not yet on Cloud API', async () => {
        const get = graphGet({
            '/777/phone_numbers': () =>
                Promise.resolve({
                    data: {
                        data: [
                            { ...numbers[0], platform_type: 'CLOUD_API' },
                            { ...numbers[1], platform_type: 'NOT_APPLICABLE' },
                        ],
                    },
                }),
        });
        const post = ok();

        await buildService(get, post).getTokenAndProfile('AQBcode');

        const registered = post.mock.calls
            .filter(([u]) => u.endsWith('/register'))
            .map(([u]) => u.split('/').at(-2));
        expect(registered).toEqual(['2066']);
        const [, opts] = get.mock.calls.find(([u]) =>
            u.endsWith('/777/phone_numbers')
        );
        expect(opts.params.fields).toContain('platform_type');
    });

    // A Graph 5xx is Meta being down, not a bad signup — worth a retry.
    it('maps a Graph 5xx during signup to a retryable 503', async () => {
        const post = jest
            .fn()
            .mockRejectedValue({ response: { status: 500, data: {} } });

        await expect(
            buildService(graphGet(), post).getTokenAndProfile('AQBcode')
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    // A number already on Cloud API keeps its own PIN, so re-registering
    // fails — but the number still works, so linking must not abort.
    it('still links when registering a number fails', async () => {
        const post = jest.fn((url: string) =>
            url.endsWith('/register')
                ? Promise.reject({ response: { status: 400, data: {} } })
                : Promise.resolve({ data: { success: true } })
        );

        const result = await buildService(graphGet(), post).getTokenAndProfile(
            'AQBcode'
        );

        expect(result.externalId).toBe('1055');
    });

    it('fails the link when the WABA subscription fails, since no messages would arrive', async () => {
        const post = jest
            .fn()
            .mockRejectedValue({ response: { status: 400, data: {} } });

        await expect(
            buildService(graphGet(), post).getTokenAndProfile('AQBcode')
        ).rejects.toMatchObject({
            response: { message: 'whatsapp.error.signupFailed' },
        });
    });

    it('fails with signupFailed when the code exchange is rejected (e.g. expired)', async () => {
        const get = graphGet({
            '/oauth/access_token': () =>
                Promise.reject({ response: { status: 400, data: {} } }),
        });

        await expect(
            buildService(get, ok()).getTokenAndProfile('AQBcode')
        ).rejects.toMatchObject({
            response: { message: 'whatsapp.error.signupFailed' },
        });
    });

    it('fails with signupFailed when no WhatsApp Business account was shared', async () => {
        const get = graphGet({
            '/debug_token': () =>
                Promise.resolve({ data: { data: { granular_scopes: [] } } }),
        });

        await expect(
            buildService(get, ok()).getTokenAndProfile('AQBcode')
        ).rejects.toMatchObject({
            response: { message: 'whatsapp.error.signupFailed' },
        });
    });

    it('fails with noPhoneNumber when the WABA has no numbers', async () => {
        const get = graphGet({
            '/777/phone_numbers': () => Promise.resolve({ data: { data: [] } }),
        });

        await expect(
            buildService(get, ok()).getTokenAndProfile('AQBcode')
        ).rejects.toMatchObject({
            response: { message: 'whatsapp.error.noPhoneNumber' },
        });
    });
});
