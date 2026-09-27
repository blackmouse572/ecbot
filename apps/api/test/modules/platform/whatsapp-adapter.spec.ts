import { createHmac } from 'crypto';
import { WhatsAppPlatformAdapter } from '../../../src/modules/platform/adapters/whatsapp/whatsapp.platform-adapter';

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
    return new WhatsAppPlatformAdapter(
        config as any,
        http as any,
        { decryptToken: () => 'TOKEN' } as any
    );
}

const sign = (body: string) =>
    'sha256=' +
    createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex');

const ACCOUNT = { accessToken: 'e', externalId: 'PHONE' } as any;

const wrap = (value: Record<string, unknown>) =>
    JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
            {
                id: 'WABA',
                changes: [
                    {
                        field: 'messages',
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '15550001111',
                                phone_number_id: 'PHONE',
                            },
                            ...value,
                        },
                    },
                ],
            },
        ],
    });

const inbound = (msg: Record<string, unknown>) =>
    wrap({
        contacts: [{ wa_id: '8490', profile: { name: 'Lan' } }],
        messages: [{ from: '8490', id: 'wamid.1', timestamp: '10', ...msg }],
    });

describe('WhatsAppPlatformAdapter.verifySignature', () => {
    it('accepts a correct signature', () => {
        const body = '{"x":1}';
        expect(
            makeAdapter().verifySignature(body, {
                'x-hub-signature-256': sign(body),
            })
        ).toBe(true);
    });

    it('rejects a tampered body', () => {
        expect(
            makeAdapter().verifySignature('{"x":2}', {
                'x-hub-signature-256': sign('{"x":1}'),
            })
        ).toBe(false);
    });
});

describe('WhatsAppPlatformAdapter.verifyChallenge', () => {
    const req = (token: string) =>
        new Request(
            `https://h/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=ping`
        );

    it('echoes the challenge for the right verify token', async () => {
        const res = makeAdapter().verifyChallenge(req('vtoken'));
        expect(res?.status).toBe(200);
        expect(await res?.text()).toBe('ping');
    });

    it('rejects a wrong verify token', () => {
        expect(makeAdapter().verifyChallenge(req('nope'))?.status).toBe(403);
    });
});

describe('WhatsAppPlatformAdapter.parse', () => {
    it('normalizes a text message', () => {
        const [e] = makeAdapter().parse(
            inbound({ type: 'text', text: { body: 'hi' } })
        );
        expect(e).toMatchObject({
            kind: 'message',
            accountKey: 'PHONE',
            senderId: '8490',
            recipientId: 'PHONE',
            senderName: 'Lan',
            externalMessageId: 'wamid.1',
            text: 'hi',
            timestamp: new Date(10_000),
        });
    });

    it('normalizes an image with caption into an attachment', () => {
        const [e] = makeAdapter().parse(
            inbound({
                type: 'image',
                image: {
                    id: 'MEDIA',
                    mime_type: 'image/jpeg',
                    caption: 'look',
                },
            })
        );
        expect(e.kind).toBe('message');
        expect(e.text).toBe('look');
        expect(e.attachments).toEqual([
            {
                type: 'image',
                raw: { id: 'MEDIA', mime_type: 'image/jpeg', caption: 'look' },
            },
        ]);
    });

    it('normalizes an interactive button reply into a postback action', () => {
        const [e] = makeAdapter().parse(
            inbound({
                type: 'interactive',
                interactive: {
                    type: 'button_reply',
                    button_reply: {
                        id: '{"id":"yes","value":"1"}',
                        title: 'Yes',
                    },
                },
            })
        );
        expect(e).toMatchObject({
            kind: 'postback',
            text: 'Yes',
            action: { id: 'yes', value: '1' },
        });
    });

    it('normalizes a reaction and an unreaction', () => {
        const a = makeAdapter();
        const [react] = a.parse(
            inbound({
                type: 'reaction',
                reaction: { message_id: 'wamid.0', emoji: '👍' },
            })
        );
        expect(react).toMatchObject({
            kind: 'reaction',
            reaction: { emoji: '👍', messageId: 'wamid.0', action: 'react' },
        });
        const [unreact] = a.parse(
            inbound({
                type: 'reaction',
                reaction: { message_id: 'wamid.0', emoji: '' },
            })
        );
        expect(unreact.reaction?.action).toBe('unreact');
    });

    it('maps statuses to delivery / read', () => {
        const events = makeAdapter().parse(
            wrap({
                statuses: [
                    {
                        id: 'wamid.9',
                        status: 'delivered',
                        timestamp: '5',
                        recipient_id: '8490',
                    },
                    {
                        id: 'wamid.9',
                        status: 'read',
                        timestamp: '6',
                        recipient_id: '8490',
                    },
                ],
            })
        );
        expect(events.map(e => e.kind)).toEqual(['delivery', 'read']);
        expect(events[0]).toMatchObject({
            accountKey: 'PHONE',
            senderId: '8490',
        });
    });

    it('ignores payloads that are not WhatsApp', () => {
        expect(
            makeAdapter().parse(JSON.stringify({ object: 'page', entry: [] }))
        ).toEqual([]);
        expect(makeAdapter().parse('not json')).toEqual([]);
    });
});

describe('WhatsAppPlatformAdapter.doSend', () => {
    const makeSender = () => {
        const post = jest
            .fn()
            .mockResolvedValue({ data: { messages: [{ id: 'wamid.out' }] } });
        return { post, a: makeAdapter({ axiosRef: { post } }) };
    };

    it('sends text to the phone number endpoint', async () => {
        const { post, a } = makeSender();
        const res = await a.sendMessage(ACCOUNT, '8490', {
            content: { kind: 'text', text: 'hello' },
            fallbackText: 'hello',
        });
        expect(res).toEqual({ externalId: 'wamid.out' });
        const [url, body, opts] = post.mock.calls[0];
        expect(url).toMatch(/\/PHONE\/messages$/);
        expect(body).toEqual({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: '8490',
            type: 'text',
            text: { body: 'hello' },
        });
        expect(opts.headers.Authorization).toBe('Bearer TOKEN');
    });

    it('truncates text to 4096 characters', async () => {
        const { post, a } = makeSender();
        await a.sendMessage(ACCOUNT, '8490', {
            content: { kind: 'text', text: 'x'.repeat(5000) },
            fallbackText: '',
        });
        expect(post.mock.calls[0][1].text.body).toHaveLength(4096);
    });

    it('sends media by link with caption', async () => {
        const { post, a } = makeSender();
        await a.sendMessage(ACCOUNT, '8490', {
            content: {
                kind: 'media',
                url: 'https://x/a.pdf',
                mediaType: 'file',
                caption: 'doc',
            },
            fallbackText: 'doc',
        });
        expect(post.mock.calls[0][1]).toMatchObject({
            type: 'document',
            document: { link: 'https://x/a.pdf', caption: 'doc' },
        });
    });

    it('renders up to 3 quick replies as interactive reply buttons', async () => {
        const { post, a } = makeSender();
        await a.sendMessage(ACCOUNT, '8490', {
            content: { kind: 'text', text: 'pick' },
            quickReplies: [
                { id: 'a', label: 'A' },
                { id: 'b', label: 'B', value: '2' },
            ],
            fallbackText: 'pick',
        });
        expect(post.mock.calls[0][1]).toMatchObject({
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: 'pick' },
                action: {
                    buttons: [
                        {
                            type: 'reply',
                            reply: { id: '{"id":"a"}', title: 'A' },
                        },
                        {
                            type: 'reply',
                            reply: { id: '{"id":"b","value":"2"}', title: 'B' },
                        },
                    ],
                },
            },
        });
    });

    it('truncates the interactive body to 1024 characters', async () => {
        const { post, a } = makeSender();
        await a.sendMessage(ACCOUNT, '8490', {
            content: { kind: 'text', text: 'x'.repeat(2000) },
            quickReplies: [{ id: 'a', label: 'A' }],
            fallbackText: '',
        });
        expect(post.mock.calls[0][1].interactive.body.text).toHaveLength(1024);
    });

    it('folds more than 3 quick replies into the text', async () => {
        const { post, a } = makeSender();
        await a.sendMessage(ACCOUNT, '8490', {
            content: { kind: 'text', text: 'pick' },
            quickReplies: ['A', 'B', 'C', 'D'].map(l => ({ id: l, label: l })),
            fallbackText: 'pick',
        });
        expect(post.mock.calls[0][1]).toMatchObject({
            type: 'text',
            text: { body: 'pick\n- A\n- B\n- C\n- D' },
        });
    });
});

describe('WhatsAppPlatformAdapter.doReact', () => {
    it('sends a reaction, and an empty emoji to unreact', async () => {
        const post = jest.fn().mockResolvedValue({ data: {} });
        const a = makeAdapter({ axiosRef: { post } });
        await a.addReaction(ACCOUNT, '8490', 'wamid.1', '❤️');
        await a.addReaction(ACCOUNT, '8490', 'wamid.1', '❤️', 'unreact');
        expect(post.mock.calls[0][1]).toMatchObject({
            to: '8490',
            type: 'reaction',
            reaction: { message_id: 'wamid.1', emoji: '❤️' },
        });
        expect(post.mock.calls[1][1].reaction.emoji).toBe('');
    });
});
