import { createHmac } from 'crypto';
import { ThreadsPlatformAdapter } from '../../../src/modules/platform/adapters/threads/threads.platform-adapter';

const APP_SECRET = 'threads-sekret';
const config = {
    get: (k: string) =>
        k === 'oauth.threads.appSecret'
            ? APP_SECRET
            : k === 'facebook.webhookSecret'
              ? 'vtoken'
              : undefined,
};

function makeAdapter(
    http: any = { axiosRef: { post: jest.fn(), get: jest.fn() } },
    messages: any = { findLatestInboundBySender: jest.fn() }
) {
    return new ThreadsPlatformAdapter(
        config as any,
        http as any,
        { decryptToken: () => 'TOKEN' } as any,
        messages
    );
}

const sign = (body: string) =>
    'sha256=' +
    createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex');

const ME = '1789';
const ACCOUNT = { id: 'acc-1', accessToken: 'e', externalId: ME } as any;

const reply = (value: Record<string, unknown> = {}, field = 'replies') => ({
    field,
    value: {
        id: 'R1',
        username: 'lan.nguyen',
        text: 'Còn size M không shop?',
        media_type: 'TEXT_POST',
        timestamp: '2026-10-07T08:00:00+0000',
        replied_to: { id: 'P1' },
        root_post: { id: 'P1', owner_id: ME, username: 'eccho.shop' },
        ...value,
    },
});

const envelope = (values: unknown) =>
    JSON.stringify({
        app_id: 'APP',
        topic: 'moderate',
        target_id: ME,
        time: 1791360000,
        values,
    });

describe('ThreadsPlatformAdapter.verifySignature', () => {
    it('accepts a body signed with the Threads app secret', () => {
        const body = envelope(reply());
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

describe('ThreadsPlatformAdapter.verifyChallenge', () => {
    const req = (token: string) =>
        new Request(
            `https://api.example.com/v1/webhooks/threads?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=ping`
        );

    it('echoes the challenge for the shared Meta verify token', async () => {
        const res = makeAdapter().verifyChallenge(req('vtoken'));
        expect(res?.status).toBe(200);
        expect(await res?.text()).toBe('ping');
    });

    it('refuses a wrong verify token', () => {
        expect(makeAdapter().verifyChallenge(req('nope'))?.status).toBe(403);
    });
});

describe('ThreadsPlatformAdapter.parse', () => {
    it('turns a reply into a message keyed on the target profile', () => {
        const [event] = makeAdapter().parse(envelope(reply()));
        expect(event).toMatchObject({
            kind: 'message',
            accountKey: ME,
            senderId: 'lan.nguyen',
            recipientId: ME,
            senderName: '@lan.nguyen',
            externalMessageId: 'R1',
            text: 'Còn size M không shop?',
        });
        expect(event.timestamp.toISOString()).toBe('2026-10-07T08:00:00.000Z');
    });

    it('turns a mention into a message', () => {
        const events = makeAdapter().parse(
            envelope(
                reply(
                    { id: 'M1', root_post: undefined, replied_to: undefined },
                    'mentions'
                )
            )
        );
        expect(events).toHaveLength(1);
        expect(events[0].externalMessageId).toBe('M1');
    });

    it('reads a batched values list', () => {
        const events = makeAdapter().parse(
            envelope([reply({ id: 'R1' }), reply({ id: 'R2' })])
        );
        expect(events.map(e => e.externalMessageId)).toEqual(['R1', 'R2']);
    });

    it('reads the classic entry/changes envelope', () => {
        const body = JSON.stringify({
            object: 'threads',
            entry: [{ id: ME, time: 1, changes: [reply()] }],
        });
        expect(makeAdapter().parse(body)[0]).toMatchObject({
            accountKey: ME,
            senderId: 'lan.nguyen',
        });
    });

    it("drops the profile's own replies under its posts", () => {
        expect(
            makeAdapter().parse(envelope(reply({ username: 'eccho.shop' })))
        ).toEqual([]);
    });

    it('keeps a reply under a post owned by someone else', () => {
        const events = makeAdapter().parse(
            envelope(
                reply({
                    username: 'eccho.shop',
                    root_post: { id: 'X', owner_id: '42', username: 'other' },
                })
            )
        );
        expect(events).toHaveLength(1);
    });

    it('ignores publish and delete notifications', () => {
        expect(makeAdapter().parse(envelope(reply({}, 'publish')))).toEqual([]);
    });

    it('carries an image reply as an attachment', () => {
        const [event] = makeAdapter().parse(
            envelope(
                reply({
                    media_type: 'IMAGE',
                    media_url: 'https://cdn.threads.net/i.jpg',
                })
            )
        );
        expect(event.attachments).toEqual([
            { type: 'image', url: 'https://cdn.threads.net/i.jpg' },
        ]);
    });

    it('returns nothing for malformed JSON', () => {
        expect(makeAdapter().parse('not json')).toEqual([]);
    });
});

describe('ThreadsPlatformAdapter.sendMessage', () => {
    it("publishes a reply to the customer's latest post", async () => {
        const post = jest
            .fn()
            .mockResolvedValueOnce({ data: { id: 'C1' } })
            .mockResolvedValueOnce({ data: { id: 'PUB1' } });
        const messages = {
            findLatestInboundBySender: jest
                .fn()
                .mockResolvedValue({ externalId: 'R9' }),
        };
        const adapter = makeAdapter({ axiosRef: { post } }, messages);

        const res = await adapter.sendMessage(ACCOUNT, 'lan.nguyen', {
            content: { kind: 'text', text: 'Dạ còn ạ' },
            fallbackText: 'Dạ còn ạ',
        });

        expect(res).toEqual({ externalId: 'PUB1' });
        expect(messages.findLatestInboundBySender).toHaveBeenCalledWith(
            'acc-1',
            'lan.nguyen'
        );
        const [createUrl, createBody] = post.mock.calls[0];
        expect(createUrl).toBe(`https://graph.threads.net/v1.0/${ME}/threads`);
        expect(Object.fromEntries(createBody)).toEqual({
            media_type: 'TEXT',
            text: 'Dạ còn ạ',
            reply_to_id: 'R9',
            access_token: 'TOKEN',
        });
        const [publishUrl, publishBody] = post.mock.calls[1];
        expect(publishUrl).toBe(
            `https://graph.threads.net/v1.0/${ME}/threads_publish`
        );
        expect(publishBody.get('creation_id')).toBe('C1');
    });

    it('caps the reply at 500 characters', async () => {
        const post = jest.fn().mockResolvedValue({ data: { id: 'X' } });
        const adapter = makeAdapter(
            { axiosRef: { post } },
            {
                findLatestInboundBySender: jest
                    .fn()
                    .mockResolvedValue({ externalId: 'R9' }),
            }
        );
        await adapter.sendMessage(ACCOUNT, 'lan.nguyen', {
            content: { kind: 'text', text: 'a'.repeat(800) },
            fallbackText: '',
        });
        expect([...post.mock.calls[0][1].get('text')]).toHaveLength(500);
    });

    it('fails without a post to reply to', async () => {
        const post = jest.fn();
        const adapter = makeAdapter(
            { axiosRef: { post } },
            { findLatestInboundBySender: jest.fn().mockResolvedValue(null) }
        );
        await expect(
            adapter.sendMessage(ACCOUNT, 'lan.nguyen', {
                content: { kind: 'text', text: 'hi' },
                fallbackText: 'hi',
            })
        ).rejects.toMatchObject({ status: 422 });
        expect(post).not.toHaveBeenCalled();
    });
});
