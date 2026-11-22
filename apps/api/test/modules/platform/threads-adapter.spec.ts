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

const ME = '39520620810916023';
const MEDIA = '17997005763099368';
const ACCOUNT = { id: 'acc-1', accessToken: 'e', externalId: ME } as any;

const reply = (value: Record<string, unknown> = {}, field = 'replies') => ({
    field,
    value: {
        id: 'R1',
        username: 'lan.nguyen',
        text: 'Còn size M không shop?',
        media_type: 'TEXT_POST',
        timestamp: '2026-10-07T08:00:00+0000',
        replied_to: { id: MEDIA },
        root_post: { id: MEDIA, owner_id: ME, username: 'eccho.shop' },
        ...value,
    },
});

/**
 * Meta's Threads envelope. `target_id` is NOT always the linked profile: for a
 * `replies` webhook it is the id of the post that received the reply, and only
 * `mentions` carries the mentioned user's app-scoped id (see
 * https://developers.facebook.com/docs/threads/webhooks).
 */
const envelope = (values: unknown, targetId = MEDIA) =>
    JSON.stringify({
        app_id: 'APP',
        topic:
            values && (values as any).field === 'mentions'
                ? 'interaction'
                : 'moderate',
        target_id: targetId,
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
    // Regression: Meta puts the post id in `target_id` for `replies`, so keying
    // the event on it looked the post up as if it were a profile and every
    // comment was dropped with "No account for externalId=<post id>".
    it('keys a reply on the post owner, not on the post id in target_id', () => {
        const [event] = makeAdapter().parse(envelope(reply(), MEDIA));
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

    it('keys a mention on the mentioned profile in target_id', () => {
        const events = makeAdapter().parse(
            envelope(
                reply(
                    { id: 'M1', root_post: undefined, replied_to: undefined },
                    'mentions'
                ),
                ME
            )
        );
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
            accountKey: ME,
            externalMessageId: 'M1',
        });
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

    it('drops a reply with no root post owner to route on', () => {
        expect(
            makeAdapter().parse(
                envelope(
                    reply({ username: 'eccho.shop', root_post: undefined })
                )
            )
        ).toEqual([]);
        expect(
            makeAdapter().parse(
                envelope(reply({ root_post: { id: 'P1', username: 'x' } }))
            )
        ).toEqual([]);
    });

    it('keeps a reply under a post owned by someone else, keyed on that owner', () => {
        const events = makeAdapter().parse(
            envelope(
                reply({
                    username: 'eccho.shop',
                    root_post: { id: 'X', owner_id: '42', username: 'other' },
                })
            )
        );
        expect(events).toHaveLength(1);
        expect(events[0].accountKey).toBe('42');
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

    // Threads counts an emoji as its UTF-8 bytes toward the 500 limit.
    it('counts emoji by their UTF-8 bytes', async () => {
        const post = jest.fn().mockResolvedValue({ data: { id: 'X' } });
        const adapter = makeAdapter(
            { axiosRef: { post } },
            {
                findLatestInboundBySender: jest
                    .fn()
                    .mockResolvedValue({ externalId: 'R9' }),
            }
        );
        const send = (text: string) =>
            adapter.sendMessage(ACCOUNT, 'lan.nguyen', {
                content: { kind: 'text', text },
                fallbackText: '',
            });

        await send('👍'.repeat(200));
        expect(
            Buffer.byteLength(post.mock.calls[0][1].get('text'), 'utf8')
        ).toBeLessThanOrEqual(500);

        // Vietnamese letters still count once each.
        const vi = 'ạ'.repeat(500);
        await send(vi);
        expect(post.mock.calls[2][1].get('text')).toBe(vi);
    });

    // What Threads answers when the reply target was deleted or filtered after
    // its webhook fired (code 100, subcode 33).
    const graphError = (code: number, subcode?: number) =>
        Object.assign(new Error('Request failed with status code 400'), {
            isAxiosError: true,
            response: {
                status: 400,
                data: {
                    error: {
                        message: 'The requested resource does not exist',
                        code,
                        error_subcode: subcode,
                    },
                },
            },
        });
    const vanished = () => graphError(100, 33);

    // A reply under one of our posts: the root is ours, the replied-to post
    // may be another customer's comment.
    const latest = {
        externalId: 'R9',
        raw: {
            field: 'replies',
            replied_to: { id: 'PARENT' },
            root_post: { id: 'ROOT', owner_id: ME },
        },
    };

    it("falls back to our own root post when a reply's target is gone", async () => {
        const post = jest
            .fn()
            .mockRejectedValueOnce(vanished()) // R9
            .mockResolvedValueOnce({ data: { id: 'C1' } }) // ROOT
            .mockResolvedValueOnce({ data: { id: 'PUB1' } });
        const adapter = makeAdapter(
            { axiosRef: { post } },
            { findLatestInboundBySender: jest.fn().mockResolvedValue(latest) }
        );

        const res = await adapter.sendMessage(ACCOUNT, 'lan.nguyen', {
            content: { kind: 'text', text: 'Dạ còn ạ' },
            fallbackText: 'Dạ còn ạ',
        });

        expect(res).toEqual({ externalId: 'PUB1' });
        expect(
            post.mock.calls.slice(0, 2).map(c => c[1].get('reply_to_id'))
        ).toEqual(['R9', 'ROOT']);
        expect(post.mock.calls[2][1].get('creation_id')).toBe('C1');
    });

    // Never answer in public under someone else's post: a vanished mention
    // lives in the customer's own thread.
    it.each([
        [
            'a mention',
            {
                field: 'mentions',
                replied_to: { id: 'THEIRS' },
                root_post: { id: 'THEIR_ROOT', username: 'lan.nguyen' },
            },
        ],
        [
            "a reply under someone else's post",
            {
                field: 'replies',
                replied_to: { id: 'THEIRS' },
                root_post: { id: 'THEIR_ROOT', owner_id: 'someone-else' },
            },
        ],
    ])('does not fall back for %s', async (_, raw) => {
        const post = jest.fn().mockRejectedValue(vanished());
        const adapter = makeAdapter(
            { axiosRef: { post } },
            {
                findLatestInboundBySender: jest
                    .fn()
                    .mockResolvedValue({ externalId: 'R9', raw }),
            }
        );

        await expect(
            adapter.sendMessage(ACCOUNT, 'lan.nguyen', {
                content: { kind: 'text', text: 'hi' },
                fallbackText: 'hi',
            })
        ).rejects.toMatchObject({ status: 502 });
        expect(post).toHaveBeenCalledTimes(1);
    });

    it('does not retry other Threads errors', async () => {
        const post = jest.fn().mockRejectedValue(graphError(190));
        const adapter = makeAdapter(
            { axiosRef: { post } },
            { findLatestInboundBySender: jest.fn().mockResolvedValue(latest) }
        );

        await expect(
            adapter.sendMessage(ACCOUNT, 'lan.nguyen', {
                content: { kind: 'text', text: 'hi' },
                fallbackText: 'hi',
            })
        ).rejects.toMatchObject({ status: 502 });
        expect(post).toHaveBeenCalledTimes(1);
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
