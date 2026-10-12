import { HttpService } from '@nestjs/axios';
import axios from 'axios';
import { createHmac } from 'crypto';
import nock from 'nock';
import { InstagramOAuthService } from '../../../src/common/instagram/services/instagram-oauth.service';
import { InstagramPlatformAdapter } from '../../../src/modules/platform/adapters/instagram/instagram.platform-adapter';

// Runs the real axios client against nock, so these tests pin the exact HTTP
// requests (host, path, query, body) that reach Instagram, not just our calls
// into a mocked client.

const APP_ID = '555';
const APP_SECRET = 'ig-sekret';
const REDIRECT_URI = 'https://app.test/auth/instagram/callback';
const IG_ID = '17841400000000001';
const CUSTOMER = '987654321';

const config = {
    get: (k: string) =>
        ({
            'oauth.instagram.appId': APP_ID,
            'oauth.instagram.appSecret': APP_SECRET,
            'oauth.instagram.redirectUri': REDIRECT_URI,
            'facebook.webhookSecret': 'vtoken',
        })[k],
};

const http = new HttpService(axios.create());
const account = {
    id: 'acc-1',
    externalId: IG_ID,
    accessToken: 'enc',
} as any;
const adapter = new InstagramPlatformAdapter(config as any, http, {
    decryptToken: () => 'LONG_TOKEN',
} as any);
const oauth = new InstagramOAuthService(config as any, http);

const graph = () => nock('https://graph.instagram.com');

beforeAll(() => {
    // A sandbox proxy would route requests around nock's interceptors.
    for (const k of ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy'])
        delete process.env[k];
    nock.disableNetConnect();
});

afterEach(() => {
    const pending = nock.pendingMocks();
    nock.cleanAll();
    expect(pending).toEqual([]);
});

afterAll(() => nock.enableNetConnect());

describe('Instagram Login over HTTP', () => {
    const profile = {
        id: 'app-scoped-1',
        user_id: IG_ID,
        username: 'lan.shop',
        name: 'Lan Shop',
        profile_picture_url: 'https://cdn.test/lan.png',
    };

    it('exchanges the code, subscribes webhooks and keys the account by the professional id', async () => {
        nock('https://api.instagram.com')
            .post('/oauth/access_token', body => {
                const form = new URLSearchParams(body as any);
                return (
                    form.get('client_id') === APP_ID &&
                    form.get('client_secret') === APP_SECRET &&
                    form.get('grant_type') === 'authorization_code' &&
                    form.get('redirect_uri') === REDIRECT_URI &&
                    form.get('code') === 'AUTH_CODE'
                );
            })
            .reply(200, { access_token: 'SHORT', user_id: 'app-scoped-1' });
        graph()
            .get('/access_token')
            .query({
                grant_type: 'ig_exchange_token',
                client_secret: APP_SECRET,
                access_token: 'SHORT',
            })
            .reply(200, { access_token: 'LONG_TOKEN', expires_in: 5184000 });
        graph()
            .post('/v23.0/me/subscribed_apps')
            .query({
                subscribed_fields:
                    'messages,messaging_postbacks,message_reactions,messaging_seen',
                access_token: 'LONG_TOKEN',
            })
            .reply(200, { success: true });
        graph()
            .get('/v23.0/me')
            .query({
                fields: 'user_id,username,name,profile_picture_url',
                access_token: 'LONG_TOKEN',
            })
            .reply(200, profile);

        const before = Date.now();
        const result = await oauth.getTokenAndProfile('AUTH_CODE');

        expect(result).toMatchObject({
            accessToken: 'LONG_TOKEN',
            externalId: IG_ID,
            name: 'Lan Shop',
            avatar: 'https://cdn.test/lan.png',
            link: 'https://www.instagram.com/lan.shop',
        });
        const ttl = result.tokenExpiresAt.getTime() - before;
        expect(ttl).toBeGreaterThanOrEqual(5184000 * 1000 - 1000);
        expect(ttl).toBeLessThanOrEqual(5184000 * 1000 + 1000);
    });

    it('fails the link when Instagram refuses the webhook subscription', async () => {
        nock('https://api.instagram.com')
            .post('/oauth/access_token')
            .reply(200, { access_token: 'SHORT' });
        graph()
            .get('/access_token')
            .query(true)
            .reply(200, { access_token: 'LONG_TOKEN', expires_in: 60 });
        graph()
            .post('/v23.0/me/subscribed_apps')
            .query(true)
            .reply(403, {
                error: { message: 'Application does not have permission' },
            });

        await expect(
            oauth.getTokenAndProfile('AUTH_CODE')
        ).rejects.toMatchObject({
            response: {
                message: 'instagram.error.webhookSubscriptionFailed',
            },
        });
    });

    it('refreshes a long-lived token', async () => {
        graph()
            .get('/refresh_access_token')
            .query({ grant_type: 'ig_refresh_token', access_token: 'OLD' })
            .reply(200, { access_token: 'NEW', expires_in: 5184000 });
        graph()
            .get('/v23.0/me')
            .query({
                fields: 'user_id,username,name,profile_picture_url',
                access_token: 'NEW',
            })
            .reply(200, profile);

        const result = await oauth.refreshCredentials('OLD');
        expect(result).toMatchObject({ accessToken: 'NEW', externalId: IG_ID });
    });
});

describe('Instagram messaging over HTTP', () => {
    it('handles an inbound DM end to end: verify, parse, look up the sender, reply', async () => {
        const rawBody = JSON.stringify({
            object: 'instagram',
            entry: [
                {
                    id: IG_ID,
                    time: 1760000000000,
                    messaging: [
                        {
                            sender: { id: CUSTOMER },
                            recipient: { id: IG_ID },
                            timestamp: 1760000000000,
                            message: {
                                mid: 'aWdfZAG1',
                                text: 'Còn size M không?',
                            },
                        },
                    ],
                },
            ],
        });
        const signature =
            'sha256=' +
            createHmac('sha256', APP_SECRET).update(rawBody).digest('hex');

        expect(
            adapter.verifySignature(rawBody, {
                'x-hub-signature-256': signature,
            })
        ).toBe(true);
        const [event] = adapter.parse(rawBody);
        expect(event).toMatchObject({
            kind: 'message',
            accountKey: IG_ID,
            senderId: CUSTOMER,
            externalMessageId: 'aWdfZAG1',
            text: 'Còn size M không?',
        });

        graph()
            .get(`/v23.0/${CUSTOMER}`)
            .query({
                fields: 'name,username,profile_pic',
                access_token: 'LONG_TOKEN',
            })
            .reply(200, {
                id: CUSTOMER,
                name: 'Minh',
                username: 'minh.nguyen',
                profile_pic: 'https://cdn.test/minh.png',
            });
        const sender = await adapter.fetchSenderProfile(
            account,
            event.senderId
        );
        expect(sender).toMatchObject({
            id: CUSTOMER,
            name: 'Minh',
            avatar: 'https://cdn.test/minh.png',
        });

        graph()
            .post('/v23.0/me/messages', {
                recipient: { id: CUSTOMER },
                message: { text: 'Dạ còn ạ' },
            })
            .query({ access_token: 'LONG_TOKEN' })
            .reply(200, { recipient_id: CUSTOMER, message_id: 'aWdfOUT1' });
        const sent = await adapter.sendMessage(account, event.senderId, {
            content: { kind: 'text', text: 'Dạ còn ạ' },
            fallbackText: 'Dạ còn ạ',
        });
        expect(sent).toEqual({ externalId: 'aWdfOUT1' });
    });

    it('sends a card with quick replies in one request', async () => {
        graph()
            .post('/v23.0/me/messages', {
                recipient: { id: CUSTOMER },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'generic',
                            elements: [
                                {
                                    title: 'Áo thun',
                                    subtitle: '199k',
                                    image_url: 'https://cdn.test/a.png',
                                    buttons: [
                                        {
                                            type: 'web_url',
                                            title: 'Xem',
                                            url: 'https://shop.test/a',
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    quick_replies: [
                        {
                            content_type: 'text',
                            title: 'Mua',
                            payload: JSON.stringify({ id: 'buy' }),
                        },
                    ],
                },
            })
            .query({ access_token: 'LONG_TOKEN' })
            .reply(200, { message_id: 'aWdfOUT2' });

        const sent = await adapter.sendMessage(account, CUSTOMER, {
            content: {
                kind: 'card',
                card: {
                    title: 'Áo thun',
                    subtitle: '199k',
                    imageUrl: 'https://cdn.test/a.png',
                    buttons: [
                        {
                            kind: 'link',
                            label: 'Xem',
                            url: 'https://shop.test/a',
                        },
                    ],
                },
            },
            quickReplies: [{ id: 'buy', label: 'Mua' }],
            fallbackText: 'Áo thun 199k',
        });
        expect(sent.externalId).toBe('aWdfOUT2');
    });

    it('sends typing, read and love reaction sender actions', async () => {
        for (const body of [
            { recipient: { id: CUSTOMER }, sender_action: 'typing_on' },
            { recipient: { id: CUSTOMER }, sender_action: 'mark_seen' },
            {
                recipient: { id: CUSTOMER },
                sender_action: 'react',
                payload: { message_id: 'aWdfZAG1', reaction: 'love' },
            },
        ]) {
            graph()
                .post('/v23.0/me/messages', body)
                .query({ access_token: 'LONG_TOKEN' })
                .reply(200, { recipient_id: CUSTOMER });
        }

        await adapter.startTyping(account, CUSTOMER, true);
        await adapter.markRead(account, CUSTOMER);
        await adapter.addReaction(account, CUSTOMER, 'aWdfZAG1', '❤️');
    });

    it('surfaces the Graph error when a send is rejected', async () => {
        graph()
            .post('/v23.0/me/messages')
            .query(true)
            .reply(400, {
                error: {
                    message: 'This message is sent outside of allowed window.',
                    code: 10,
                    error_subcode: 2534022,
                },
            });

        await expect(
            adapter.sendMessage(account, CUSTOMER, {
                content: { kind: 'text', text: 'late' },
                fallbackText: 'late',
            })
        ).rejects.toThrow(/outside of allowed window/);
    });

    it('keeps the turn going when a sender profile lookup fails', async () => {
        graph().get(`/v23.0/${CUSTOMER}`).query(true).reply(500, {});
        await expect(
            adapter.fetchSenderProfile(account, CUSTOMER)
        ).resolves.toEqual({ id: CUSTOMER });
    });
});
