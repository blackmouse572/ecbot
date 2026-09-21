import { createHash } from 'crypto';
import { ZaloPlatformAdapter } from '../../../src/modules/platform/adapters/zalo/zalo.platform-adapter';

const APP_ID = 'app-123';
const APP_SECRET = 'sekret';
const config = {
    get: (k: string) =>
        k === 'oauth.zalo.appId'
            ? APP_ID
            : k === 'oauth.zalo.appSecret'
              ? APP_SECRET
              : undefined,
};

function makeAdapter(
    http: any = { axiosRef: { post: jest.fn(), get: jest.fn() } }
) {
    return new ZaloPlatformAdapter(
        config as any,
        http as any,
        {
            decryptToken: () => 'TOKEN',
        } as any
    );
}

// mac = SHA256(appId + rawBody + timestamp + appSecret)
const sign = (body: string, timestamp: string) =>
    'mac=' +
    createHash('sha256')
        .update(APP_ID + body + timestamp + APP_SECRET, 'utf8')
        .digest('hex');

describe('ZaloPlatformAdapter.verifySignature', () => {
    // Freshness guard rejects stale timestamps, so sign against "now".
    const now = String(Date.now());
    const body = JSON.stringify({ timestamp: now, sender: { id: 'S' } });

    it('accepts a correct signature', () => {
        const a = makeAdapter();
        expect(
            a.verifySignature(body, { 'x-zevent-signature': sign(body, now) })
        ).toBe(true);
    });

    it('accepts a bare hash without the "mac=" prefix', () => {
        const a = makeAdapter();
        const bare = sign(body, now).slice(4);
        expect(a.verifySignature(body, { 'x-zevent-signature': bare })).toBe(
            true
        );
    });

    it('rejects a tampered body', () => {
        const a = makeAdapter();
        const tampered = JSON.stringify({
            timestamp: now,
            sender: { id: 'HACKER' },
        });
        expect(
            a.verifySignature(tampered, {
                'x-zevent-signature': sign(body, now),
            })
        ).toBe(false);
    });

    it('rejects when the timestamp differs from the signed one', () => {
        const a = makeAdapter();
        expect(
            a.verifySignature(body, {
                'x-zevent-signature': sign(body, '9999999999999'),
            })
        ).toBe(false);
    });

    it('rejects a valid signature with a stale timestamp (replay guard)', () => {
        const a = makeAdapter();
        const stale = String(Date.now() - 10 * 60 * 1000); // 10 min ago
        const staleBody = JSON.stringify({
            timestamp: stale,
            sender: { id: 'S' },
        });
        // signature is correct for the stale body — only freshness rejects it
        expect(
            a.verifySignature(staleBody, {
                'x-zevent-signature': sign(staleBody, stale),
            })
        ).toBe(false);
    });

    it('rejects a missing signature header', () => {
        const a = makeAdapter();
        expect(a.verifySignature(body, {})).toBe(false);
    });

    it('rejects an unparseable body', () => {
        const a = makeAdapter();
        expect(
            a.verifySignature('not-json', {
                'x-zevent-signature': 'mac=deadbeef',
            })
        ).toBe(false);
    });
});

describe('ZaloPlatformAdapter.parse', () => {
    const wrap = (event: any) =>
        JSON.stringify({
            app_id: APP_ID,
            recipient: { id: 'OA' },
            timestamp: '1580890668038',
            ...event,
        });

    it('normalizes a text message', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                event_name: 'user_send_text',
                sender: { id: 'S' },
                message: { msg_id: 'm1', text: 'hi' },
            })
        );
        expect(e).toMatchObject({
            kind: 'message',
            accountKey: 'OA',
            senderId: 'S',
            recipientId: 'OA',
            text: 'hi',
            externalMessageId: 'm1',
        });
        expect(e.timestamp).toEqual(new Date(1580890668038));
    });

    it('normalizes an image attachment', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                event_name: 'user_send_image',
                sender: { id: 'S' },
                message: {
                    msg_id: 'm2',
                    attachments: [
                        { type: 'image', payload: { url: 'http://img' } },
                    ],
                },
            })
        );
        expect(e.kind).toBe('message');
        expect(e.attachments).toEqual([
            {
                type: 'image',
                url: 'http://img',
                raw: { type: 'image', payload: { url: 'http://img' } },
            },
        ]);
    });

    it('maps gif attachments to image and unknown types to file', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                event_name: 'user_send_gif',
                sender: { id: 'S' },
                message: {
                    msg_id: 'm3',
                    attachments: [
                        { type: 'gif', payload: { url: 'http://g' } },
                        { type: 'link', payload: { url: 'http://l' } },
                    ],
                },
            })
        );
        expect(e.attachments?.map(x => x.type)).toEqual(['image', 'file']);
    });

    it('classifies oa_send_text as echo', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({
                event_name: 'oa_send_text',
                sender: { id: 'OA' },
                message: { msg_id: 'm4', text: 'reply' },
            })
        );
        expect(e.kind).toBe('echo');
    });

    it('classifies user_seen_message as read and user_received_message as delivery', () => {
        const a = makeAdapter();
        const [seen] = a.parse(
            wrap({ event_name: 'user_seen_message', sender: { id: 'S' } })
        );
        const [received] = a.parse(
            wrap({ event_name: 'user_received_message', sender: { id: 'S' } })
        );
        expect(seen.kind).toBe('read');
        expect(received.kind).toBe('delivery');
    });

    it('classifies an unknown event name as unknown', () => {
        const a = makeAdapter();
        const [e] = a.parse(
            wrap({ event_name: 'user_click_chatnow', sender: { id: 'S' } })
        );
        expect(e.kind).toBe('unknown');
    });

    it('returns [] when there is no sender', () => {
        const a = makeAdapter();
        expect(
            a.parse(JSON.stringify({ event_name: 'user_send_text' }))
        ).toEqual([]);
    });

    it('returns [] for parse("null") without throwing', () => {
        const a = makeAdapter();
        expect(a.parse('null')).toEqual([]);
    });

    it('returns [] for an unparseable body without throwing', () => {
        const a = makeAdapter();
        expect(a.parse('not-json')).toEqual([]);
    });
});

const account = { accessToken: 'enc' } as any;

describe('ZaloPlatformAdapter.doSend', () => {
    it('POSTs text to /message/cs with the decrypted token and returns message_id', async () => {
        const post = jest
            .fn()
            .mockResolvedValue({
                data: { error: 0, data: { message_id: 'zm1' } },
            });
        const a = makeAdapter({ axiosRef: { post } });

        const res = await a.sendMessage(account, 'S', {
            content: { kind: 'text', text: 'hi' },
            fallbackText: 'hi',
        });

        expect(res).toEqual({ externalId: 'zm1' });
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/message/cs'),
            { recipient: { user_id: 'S' }, message: { text: 'hi' } },
            {
                headers: {
                    access_token: 'TOKEN',
                    'Content-Type': 'application/json',
                },
            }
        );
    });

    it('degrades a card to its fallbackText (capabilities all false)', async () => {
        const post = jest
            .fn()
            .mockResolvedValue({
                data: { error: 0, data: { message_id: 'zm2' } },
            });
        const a = makeAdapter({ axiosRef: { post } });

        await a.sendMessage(account, 'S', {
            content: { kind: 'card', card: { title: 'T', body: 'B' } },
            fallbackText: 'fallback text',
        });

        expect(post.mock.calls[0][1].message).toEqual({
            text: 'fallback text',
        });
    });

    it('throws when Zalo returns a non-zero error code', async () => {
        const post = jest
            .fn()
            .mockResolvedValue({
                data: { error: -216, message: 'user blocked OA' },
            });
        const a = makeAdapter({ axiosRef: { post } });

        await expect(
            a.sendMessage(account, 'S', {
                content: { kind: 'text', text: 'hi' },
                fallbackText: 'hi',
            })
        ).rejects.toThrow();
    });

    it('throws on empty text without calling the API', async () => {
        const post = jest.fn();
        const a = makeAdapter({ axiosRef: { post } });

        await expect(
            a.sendMessage(account, 'S', {
                content: { kind: 'text', text: '   ' },
                fallbackText: '   ',
            })
        ).rejects.toThrow();
        expect(post).not.toHaveBeenCalled();
    });
});

describe('ZaloPlatformAdapter.fetchSenderProfile', () => {
    it('maps the Zalo profile response', async () => {
        const get = jest.fn().mockResolvedValue({
            data: {
                error: 0,
                data: {
                    user_id: 'S',
                    display_name: 'Alice',
                    avatar: 'http://a',
                },
            },
        });
        const a = makeAdapter({ axiosRef: { get } });

        const profile = await a.fetchSenderProfile(account, 'S');

        expect(profile).toMatchObject({
            id: 'S',
            name: 'Alice',
            avatar: 'http://a',
        });
        expect(get).toHaveBeenCalledWith(
            expect.stringContaining('/getprofile'),
            {
                params: { data: JSON.stringify({ user_id: 'S' }) },
                headers: { access_token: 'TOKEN' },
            }
        );
    });

    it('returns a stub { id } and logs on error instead of throwing', async () => {
        const get = jest.fn().mockRejectedValue(new Error('network down'));
        const a = makeAdapter({ axiosRef: { get } });
        const warn = jest.spyOn((a as any).logger, 'warn').mockImplementation();

        const profile = await a.fetchSenderProfile(account, 'S');

        expect(profile).toEqual({ id: 'S' });
        expect(warn).toHaveBeenCalled();
    });
});
