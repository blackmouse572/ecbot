import { createHmac } from 'crypto';
import { MessengerPlatformAdapter } from '../../../src/modules/platform/adapters/messenger/messenger.platform-adapter';

const APP_SECRET = 'sekret';
const config = {
    get: (k: string) =>
        k === 'facebook.appSecret'
            ? APP_SECRET
            : k === 'facebook.webhookSecret'
              ? 'vtoken'
              : undefined,
};

function makeAdapter(
    http: any = { axiosRef: { post: jest.fn(), get: jest.fn() } }
) {
    return new MessengerPlatformAdapter(
        config as any,
        http as any,
        { decryptToken: () => 'TOKEN' } as any
    );
}

const sign = (body: string) =>
    'sha256=' +
    createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex');

describe('MessengerPlatformAdapter.verifySignature', () => {
    it('accepts a correct signature', () => {
        const a = makeAdapter();
        const body = '{"x":1}';
        expect(
            a.verifySignature(body, { 'x-hub-signature-256': sign(body) })
        ).toBe(true);
    });
    it('rejects a tampered body', () => {
        const a = makeAdapter();
        expect(
            a.verifySignature('{"x":2}', {
                'x-hub-signature-256': sign('{"x":1}'),
            })
        ).toBe(false);
    });
});

describe('MessengerPlatformAdapter.parse', () => {
    const wrap = (event: any) =>
        JSON.stringify({
            object: 'page',
            entry: [{ id: 'PAGE', time: 1, messaging: [event] }],
        });

    it('normalizes a text message', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                sender: { id: 'S' },
                recipient: { id: 'PAGE' },
                timestamp: 1,
                message: { mid: 'm1', text: 'hi' },
            })
        );
        expect(e).toMatchObject({
            kind: 'message',
            accountKey: 'PAGE',
            senderId: 'S',
            text: 'hi',
            externalMessageId: 'm1',
        });
    });

    it('normalizes a postback into action', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                sender: { id: 'S' },
                recipient: { id: 'PAGE' },
                timestamp: 1,
                postback: {
                    mid: 'm2',
                    title: 'Yes',
                    payload: JSON.stringify({ id: 'confirm', value: 'o1' }),
                },
            })
        );
        expect(e.kind).toBe('postback');
        expect(e.action).toEqual({ id: 'confirm', value: 'o1' });
    });

    it('normalizes a quick_reply into action', () => {
        const a = makeAdapter();
        // Brief had a typo (missing closing brace for outer wrap arg) — fixed here
        const [e] = a.parse(
            wrap({
                sender: { id: 'S' },
                recipient: { id: 'PAGE' },
                timestamp: 1,
                message: {
                    mid: 'm3',
                    text: 'Yes',
                    quick_reply: {
                        payload: JSON.stringify({ id: 'q', value: 'v' }),
                    },
                },
            })
        );
        expect(e.action).toEqual({ id: 'q', value: 'v' });
    });

    it('normalizes a reaction', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                sender: { id: 'S' },
                recipient: { id: 'PAGE' },
                timestamp: 1,
                reaction: {
                    mid: 'm4',
                    emoji: '❤',
                    reaction: 'love',
                    action: 'react',
                },
            })
        );
        expect(e.kind).toBe('reaction');
        expect(e.reaction).toEqual({
            emoji: '❤',
            messageId: 'm4',
            action: 'react',
        });
    });

    it('normalizes attachments', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                sender: { id: 'S' },
                recipient: { id: 'PAGE' },
                timestamp: 1,
                message: {
                    mid: 'm5',
                    attachments: [
                        { type: 'image', payload: { url: 'http://img' } },
                    ],
                },
            })
        );
        expect(e.attachments).toEqual([
            {
                type: 'image',
                url: 'http://img',
                raw: { type: 'image', payload: { url: 'http://img' } },
            },
        ]);
    });

    it('normalizes an audio attachment', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                sender: { id: 'S' },
                recipient: { id: 'PAGE' },
                timestamp: 1,
                message: {
                    mid: 'm6',
                    attachments: [
                        { type: 'audio', payload: { url: 'http://audio' } },
                    ],
                },
            })
        );
        expect(e.attachments).toEqual([
            {
                type: 'audio',
                url: 'http://audio',
                raw: { type: 'audio', payload: { url: 'http://audio' } },
            },
        ]);
    });

    it('returns [] for parse("null") without throwing', () => {
        const a = makeAdapter();
        expect(a.parse('null')).toEqual([]);
    });

    it('returns [] for parse("123") without throwing', () => {
        const a = makeAdapter();
        expect(a.parse('123')).toEqual([]);
    });
});

describe('MessengerPlatformAdapter.doSend rendering', () => {
    it('sends plain text unchanged (parity)', async () => {
        const post = jest.fn().mockResolvedValue({ data: { message_id: 'x' } });
        const a = makeAdapter({ axiosRef: { post } });
        await a.sendMessage({ accessToken: 'e' } as any, 'S', {
            content: { kind: 'text', text: 'hi' },
            fallbackText: 'hi',
        });
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/me/messages'),
            {
                recipient: { id: 'S' },
                message: { text: 'hi' },
                messaging_type: 'RESPONSE',
            },
            { params: { access_token: 'TOKEN' } }
        );
    });

    it('renders quick replies', async () => {
        const post = jest.fn().mockResolvedValue({ data: { message_id: 'x' } });
        const a = makeAdapter({ axiosRef: { post } });
        await a.sendMessage({ accessToken: 'e' } as any, 'S', {
            content: { kind: 'text', text: 'pick' },
            quickReplies: [{ id: 'q', label: 'One', value: 'v' }],
            fallbackText: 'pick',
        });
        const body = post.mock.calls[0][1];
        expect(body.message.quick_replies).toEqual([
            {
                content_type: 'text',
                title: 'One',
                payload: JSON.stringify({ id: 'q', value: 'v' }),
            },
        ]);
    });

    it('renders a card as a generic template with buttons', async () => {
        const post = jest.fn().mockResolvedValue({ data: { message_id: 'x' } });
        const a = makeAdapter({ axiosRef: { post } });
        await a.sendMessage({ accessToken: 'e' } as any, 'S', {
            content: {
                kind: 'card',
                card: {
                    title: 'T',
                    subtitle: 'S',
                    imageUrl: 'http://i',
                    buttons: [
                        { kind: 'postback', id: 'a', label: 'Yes', value: 'y' },
                        { kind: 'link', label: 'Site', url: 'http://x' },
                    ],
                },
            },
            fallbackText: 'T',
        });
        const el = post.mock.calls[0][1].message.attachment.payload.elements[0];
        expect(el).toMatchObject({
            title: 'T',
            subtitle: 'S',
            image_url: 'http://i',
        });
        expect(el.buttons).toEqual([
            {
                type: 'postback',
                title: 'Yes',
                payload: JSON.stringify({ id: 'a', value: 'y' }),
            },
            { type: 'web_url', title: 'Site', url: 'http://x' },
        ]);
    });

    it('card with no buttons omits buttons key', async () => {
        const post = jest.fn().mockResolvedValue({ data: { message_id: 'x' } });
        const a = makeAdapter({ axiosRef: { post } });
        await a.sendMessage({ accessToken: 'e' } as any, 'S', {
            content: {
                kind: 'card',
                card: {
                    title: 'No Buttons',
                    body: 'desc',
                },
            },
            fallbackText: 'No Buttons',
        });
        const el = post.mock.calls[0][1].message.attachment.payload.elements[0];
        expect(el.buttons).toBeUndefined();
    });

    it('caps quick replies at 13', async () => {
        const post = jest.fn().mockResolvedValue({ data: { message_id: 'x' } });
        const a = makeAdapter({ axiosRef: { post } });
        const qrs = Array.from({ length: 15 }, (_, i) => ({
            id: `q${i}`,
            label: `Label ${i}`,
            value: `v${i}`,
        }));
        await a.sendMessage({ accessToken: 'e' } as any, 'S', {
            content: { kind: 'text', text: 'pick' },
            quickReplies: qrs,
            fallbackText: 'pick',
        });
        const body = post.mock.calls[0][1];
        expect(body.message.quick_replies).toHaveLength(13);
    });
});

describe('MessengerPlatformAdapter.doReact', () => {
    it('sends a react sender_action with message_id + reaction payload', async () => {
        const post = jest.fn().mockResolvedValue({ data: {} });
        const a = makeAdapter({ axiosRef: { post } });
        await a.addReaction(
            { accessToken: 'e' } as any,
            'S',
            'mid.1',
            '❤',
            'react'
        );
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/me/messages'),
            {
                recipient: { id: 'S' },
                sender_action: 'react',
                payload: { message_id: 'mid.1', reaction: '❤' },
            },
            { params: { access_token: 'TOKEN' } }
        );
    });

    it('sends an unreact sender_action with only message_id in the payload', async () => {
        const post = jest.fn().mockResolvedValue({ data: {} });
        const a = makeAdapter({ axiosRef: { post } });
        await a.addReaction(
            { accessToken: 'e' } as any,
            'S',
            'mid.1',
            '❤',
            'unreact'
        );
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/me/messages'),
            {
                recipient: { id: 'S' },
                sender_action: 'unreact',
                payload: { message_id: 'mid.1' },
            },
            { params: { access_token: 'TOKEN' } }
        );
    });

    it('surfaces the platform error body instead of a bare AxiosError', async () => {
        const post = jest.fn().mockRejectedValue({
            isAxiosError: true,
            message: 'Request failed with status code 400',
            response: {
                status: 400,
                data: {
                    error: {
                        message: '(#100) Cannot react to this message',
                        code: 100,
                    },
                },
            },
        });
        const a = makeAdapter({ axiosRef: { post } });
        await expect(
            a.addReaction(
                { accessToken: 'e' } as any,
                'S',
                'mid.1',
                '❤',
                'react'
            )
        ).rejects.toMatchObject({
            status: 502,
            response: {
                message: expect.stringContaining(
                    '(#100) Cannot react to this message'
                ),
                platformError: {
                    error: { message: expect.any(String), code: 100 },
                },
            },
        });
    });
});
