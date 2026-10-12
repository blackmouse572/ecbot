import { createHmac } from 'crypto';
import { InstagramPlatformAdapter } from '../../../src/modules/platform/adapters/instagram/instagram.platform-adapter';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';

const APP_SECRET = 'ig-sekret';
const config = {
    get: (k: string) =>
        ({
            'oauth.instagram.appId': '555',
            'oauth.instagram.appSecret': APP_SECRET,
            'facebook.webhookSecret': 'vtoken',
        })[k],
};

function makeAdapter(
    http: any = { axiosRef: { post: jest.fn(), get: jest.fn() } }
) {
    return new InstagramPlatformAdapter(
        config as any,
        http as any,
        { decryptToken: () => 'TOKEN' } as any
    );
}

const sign = (body: string, secret = APP_SECRET) =>
    'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');

const IG_ID = '17841400000000001';
const CUSTOMER = '1234567890';

const payload = (messaging: Record<string, unknown>[]) =>
    JSON.stringify({
        object: 'instagram',
        entry: [{ id: IG_ID, time: 1700000000000, messaging }],
    });

const account = { id: 'acc-1', externalId: IG_ID } as any;

describe('InstagramPlatformAdapter', () => {
    it('is registered under INSTAGRAM_PAGE', () => {
        expect(makeAdapter().type).toBe(ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE);
    });
});

describe('InstagramPlatformAdapter.verifyChallenge', () => {
    const req = (token: string) =>
        new Request(
            `https://x/webhooks/instagram?${new URLSearchParams({
                'hub.mode': 'subscribe',
                'hub.verify_token': token,
                'hub.challenge': '42',
            }).toString()}`
        );

    it('echoes the challenge when the verify token matches', async () => {
        const res = makeAdapter().verifyChallenge(req('vtoken'));
        expect(res?.status).toBe(200);
        expect(await res?.text()).toBe('42');
    });

    it('returns 403 on a wrong verify token', () => {
        expect(makeAdapter().verifyChallenge(req('nope'))?.status).toBe(403);
    });
});

describe('InstagramPlatformAdapter.verifySignature', () => {
    const body = payload([]);

    it('accepts a body signed with the Instagram app secret', () => {
        expect(
            makeAdapter().verifySignature(body, {
                'x-hub-signature-256': sign(body),
            })
        ).toBe(true);
    });

    it('rejects a tampered body', () => {
        expect(
            makeAdapter().verifySignature(body + ' ', {
                'x-hub-signature-256': sign(body),
            })
        ).toBe(false);
    });

    it('rejects a body signed with another secret', () => {
        expect(
            makeAdapter().verifySignature(body, {
                'x-hub-signature-256': sign(body, 'other'),
            })
        ).toBe(false);
    });

    it('rejects a missing signature', () => {
        expect(makeAdapter().verifySignature(body, {})).toBe(false);
    });
});

describe('InstagramPlatformAdapter.parse', () => {
    const base = {
        sender: { id: CUSTOMER },
        recipient: { id: IG_ID },
        timestamp: 1700000000000,
    };

    it('normalizes a text message keyed by the Instagram account id', () => {
        const [e] = makeAdapter().parse(
            payload([{ ...base, message: { mid: 'm1', text: 'xin chào' } }])
        );
        expect(e).toMatchObject({
            kind: 'message',
            accountKey: IG_ID,
            senderId: CUSTOMER,
            recipientId: IG_ID,
            externalMessageId: 'm1',
            text: 'xin chào',
        });
        expect(e.timestamp).toEqual(new Date(1700000000000));
    });

    it('decodes a quick reply into an action', () => {
        const [e] = makeAdapter().parse(
            payload([
                {
                    ...base,
                    message: {
                        mid: 'm2',
                        text: 'Yes',
                        quick_reply: {
                            payload: JSON.stringify({
                                id: 'confirm',
                                value: 'yes',
                            }),
                        },
                    },
                },
            ])
        );
        expect(e.action).toEqual({ id: 'confirm', value: 'yes' });
    });

    it('normalizes a postback', () => {
        const [e] = makeAdapter().parse(
            payload([
                {
                    ...base,
                    postback: { mid: 'm3', title: 'Buy', payload: 'buy' },
                },
            ])
        );
        expect(e).toMatchObject({
            kind: 'postback',
            externalMessageId: 'm3',
            text: 'Buy',
            action: { id: 'buy' },
        });
    });

    it('normalizes a reaction', () => {
        const [e] = makeAdapter().parse(
            payload([
                {
                    ...base,
                    reaction: {
                        mid: 'm4',
                        action: 'react',
                        reaction: 'love',
                        emoji: '❤️',
                    },
                },
            ])
        );
        expect(e).toMatchObject({
            kind: 'reaction',
            externalMessageId: 'm4',
            reaction: { emoji: '❤️', messageId: 'm4', action: 'react' },
        });
    });

    it('keeps media attachments and drops shares it cannot render', () => {
        const [e] = makeAdapter().parse(
            payload([
                {
                    ...base,
                    message: {
                        mid: 'm5',
                        attachments: [
                            { type: 'image', payload: { url: 'https://i/1' } },
                            { type: 'audio', payload: { url: 'https://a/1' } },
                            {
                                type: 'ig_reel',
                                payload: { url: 'https://r/1' },
                            },
                        ],
                    },
                },
            ])
        );
        expect(e.attachments?.map(a => [a.type, a.url])).toEqual([
            ['image', 'https://i/1'],
            ['audio', 'https://a/1'],
        ]);
    });

    it('swaps sender and recipient on an echo so the customer stays the sender', () => {
        const [e] = makeAdapter().parse(
            payload([
                {
                    sender: { id: IG_ID },
                    recipient: { id: CUSTOMER },
                    timestamp: 1700000000000,
                    message: { mid: 'm6', text: 'hi', is_echo: true },
                },
            ])
        );
        expect(e).toMatchObject({
            kind: 'echo',
            accountKey: IG_ID,
            senderId: CUSTOMER,
            recipientId: IG_ID,
        });
    });

    it('flags an echo of our own send by app id', () => {
        const echo = (app_id: number) =>
            makeAdapter().parse(
                payload([
                    {
                        sender: { id: IG_ID },
                        recipient: { id: CUSTOMER },
                        timestamp: 1700000000000,
                        message: {
                            mid: 'm7',
                            text: 'hi',
                            is_echo: true,
                            app_id,
                        },
                    },
                ])
            )[0].sentByUs;
        expect(echo(555)).toBe(true);
        expect(echo(999)).toBe(false);
    });

    it('marks a read receipt', () => {
        const [e] = makeAdapter().parse(
            payload([{ ...base, read: { mid: 'm1' } }])
        );
        expect(e.kind).toBe('read');
    });

    it('ignores payloads for other Meta objects', () => {
        const body = JSON.stringify({ object: 'page', entry: [] });
        expect(makeAdapter().parse(body)).toEqual([]);
    });

    it('returns [] on malformed JSON', () => {
        expect(makeAdapter().parse('{')).toEqual([]);
        expect(makeAdapter().parse('null')).toEqual([]);
    });
});

describe('InstagramPlatformAdapter.fetchSenderProfile', () => {
    it('reads name and picture from the Instagram Graph API', async () => {
        const get = jest.fn().mockResolvedValue({
            data: {
                id: CUSTOMER,
                name: 'Lan',
                username: 'lan.shop',
                profile_pic: 'https://p/1',
            },
        });
        const profile = await makeAdapter({
            axiosRef: { get, post: jest.fn() },
        }).fetchSenderProfile(account, CUSTOMER);

        expect(get.mock.calls[0][0]).toMatch(
            new RegExp(`^https://graph\\.instagram\\.com/v[\\d.]+/${CUSTOMER}$`)
        );
        expect(profile).toMatchObject({
            id: CUSTOMER,
            name: 'Lan',
            avatar: 'https://p/1',
        });
    });

    it('falls back to the username when the user has no name', async () => {
        const get = jest.fn().mockResolvedValue({
            data: { id: CUSTOMER, username: 'lan.shop' },
        });
        const profile = await makeAdapter({
            axiosRef: { get, post: jest.fn() },
        }).fetchSenderProfile(account, CUSTOMER);
        expect(profile.name).toBe('lan.shop');
    });

    it('returns just the id when the lookup fails', async () => {
        const get = jest.fn().mockRejectedValue(new Error('boom'));
        const profile = await makeAdapter({
            axiosRef: { get, post: jest.fn() },
        }).fetchSenderProfile(account, CUSTOMER);
        expect(profile).toEqual({ id: CUSTOMER });
    });
});

describe('InstagramPlatformAdapter.sendMessage', () => {
    const makeSending = () => {
        const post = jest
            .fn()
            .mockResolvedValue({ data: { message_id: 'out-1' } });
        return {
            post,
            adapter: makeAdapter({ axiosRef: { post, get: jest.fn() } }),
        };
    };

    it('posts text to /me/messages on graph.instagram.com', async () => {
        const { post, adapter } = makeSending();
        const result = await adapter.sendMessage(account, CUSTOMER, {
            content: { kind: 'text', text: 'Chào bạn' },
            fallbackText: 'Chào bạn',
        });

        expect(result.externalId).toBe('out-1');
        const [url, body, opts] = post.mock.calls[0];
        expect(url).toMatch(
            /^https:\/\/graph\.instagram\.com\/v[\d.]+\/me\/messages$/
        );
        expect(body).toEqual({
            recipient: { id: CUSTOMER },
            message: { text: 'Chào bạn' },
        });
        expect(opts.params).toEqual({ access_token: 'TOKEN' });
    });

    it('cuts text to Instagram’s 1000 character limit', async () => {
        const { post, adapter } = makeSending();
        await adapter.sendMessage(account, CUSTOMER, {
            content: { kind: 'text', text: 'a'.repeat(1500) },
            fallbackText: '',
        });
        expect(
            [...post.mock.calls[0][1].message.text].length
        ).toBeLessThanOrEqual(1000);
    });

    it('renders quick replies, capped at 13', async () => {
        const { post, adapter } = makeSending();
        await adapter.sendMessage(account, CUSTOMER, {
            content: { kind: 'text', text: 'Pick one' },
            fallbackText: 'Pick one',
            quickReplies: Array.from({ length: 15 }, (_, i) => ({
                id: `q${i}`,
                label: `Q${i}`,
            })),
        });
        const qr = post.mock.calls[0][1].message.quick_replies;
        expect(qr).toHaveLength(13);
        expect(qr[0]).toEqual({
            content_type: 'text',
            title: 'Q0',
            payload: JSON.stringify({ id: 'q0' }),
        });
    });

    it('sends an image as an attachment', async () => {
        const { post, adapter } = makeSending();
        await adapter.sendMessage(account, CUSTOMER, {
            content: {
                kind: 'media',
                mediaType: 'image',
                url: 'https://cdn/x.png',
            },
            fallbackText: '',
        });
        expect(post.mock.calls[0][1].message).toEqual({
            attachment: {
                type: 'image',
                payload: { url: 'https://cdn/x.png' },
            },
        });
    });

    it('sends a file as a link, since Instagram has no file attachment', async () => {
        const { post, adapter } = makeSending();
        await adapter.sendMessage(account, CUSTOMER, {
            content: {
                kind: 'media',
                mediaType: 'file',
                url: 'https://cdn/menu.pdf',
                caption: 'Menu',
            },
            fallbackText: '',
        });
        expect(post.mock.calls[0][1].message).toEqual({
            text: 'Menu\nhttps://cdn/menu.pdf',
        });
    });

    it('renders a card as a generic template', async () => {
        const { post, adapter } = makeSending();
        await adapter.sendMessage(account, CUSTOMER, {
            content: {
                kind: 'card',
                card: {
                    title: 'Áo thun',
                    subtitle: '199k',
                    imageUrl: 'https://cdn/a.png',
                    buttons: [
                        { kind: 'link', label: 'Xem', url: 'https://shop/a' },
                        {
                            kind: 'postback',
                            label: 'Mua',
                            id: 'buy',
                            value: 'a',
                        },
                    ],
                },
            },
            fallbackText: 'Áo thun',
        });
        const { payload: tpl } = post.mock.calls[0][1].message.attachment;
        expect(tpl.template_type).toBe('generic');
        expect(tpl.elements[0]).toMatchObject({
            title: 'Áo thun',
            subtitle: '199k',
            image_url: 'https://cdn/a.png',
            buttons: [
                { type: 'web_url', title: 'Xem', url: 'https://shop/a' },
                {
                    type: 'postback',
                    title: 'Mua',
                    payload: JSON.stringify({ id: 'buy', value: 'a' }),
                },
            ],
        });
    });

    it('surfaces the Graph error instead of a bare AxiosError', async () => {
        const err: any = new Error('Request failed with status code 400');
        err.isAxiosError = true;
        err.response = {
            status: 400,
            data: { error: { message: 'Outside of allowed window' } },
        };
        const post = jest.fn().mockRejectedValue(err);
        const adapter = makeAdapter({ axiosRef: { post, get: jest.fn() } });
        await expect(
            adapter.sendMessage(account, CUSTOMER, {
                content: { kind: 'text', text: 'late' },
                fallbackText: 'late',
            })
        ).rejects.toThrow(/Outside of allowed window/);
    });
});

describe('InstagramPlatformAdapter sender actions', () => {
    it('reacts to a message with the love reaction', async () => {
        const post = jest.fn().mockResolvedValue({ data: {} });
        await makeAdapter({ axiosRef: { post, get: jest.fn() } }).addReaction(
            account,
            CUSTOMER,
            'mid-1',
            '❤️',
            'react'
        );
        expect(post.mock.calls[0][1]).toEqual({
            recipient: { id: CUSTOMER },
            sender_action: 'react',
            payload: { message_id: 'mid-1', reaction: 'love' },
        });
    });

    it('skips emoji Instagram cannot send, since it only allows love', async () => {
        const post = jest.fn();
        await makeAdapter({ axiosRef: { post, get: jest.fn() } }).addReaction(
            account,
            CUSTOMER,
            'mid-1',
            '👍',
            'react'
        );
        expect(post).not.toHaveBeenCalled();
    });

    it('removes a reaction', async () => {
        const post = jest.fn().mockResolvedValue({ data: {} });
        await makeAdapter({ axiosRef: { post, get: jest.fn() } }).addReaction(
            account,
            CUSTOMER,
            'mid-1',
            '❤️',
            'unreact'
        );
        expect(post.mock.calls[0][1]).toEqual({
            recipient: { id: CUSTOMER },
            sender_action: 'unreact',
            payload: { message_id: 'mid-1' },
        });
    });

    it('sends typing_on', async () => {
        const post = jest.fn().mockResolvedValue({ data: {} });
        await makeAdapter({ axiosRef: { post, get: jest.fn() } }).startTyping(
            account,
            CUSTOMER,
            true
        );
        expect(post.mock.calls[0][1]).toEqual({
            recipient: { id: CUSTOMER },
            sender_action: 'typing_on',
        });
    });
});
