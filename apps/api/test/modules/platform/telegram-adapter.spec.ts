import { TelegramPlatformAdapter } from '../../../src/modules/platform/adapters/telegram/telegram.platform-adapter';

const SECRET = 'validSecret_1234-ABCDEFGHIJKLMNOPQRSTUVWXYZabcde';

function makeAdapter(secret = SECRET) {
    const config = {
        get: (k: string) =>
            k === 'telegram.webhookSecretToken'
                ? secret
                : k === 'telegram.apiUrl'
                  ? 'https://api.telegram.org'
                  : undefined,
    };
    return new TelegramPlatformAdapter(
        config as any,
        { axiosRef: { get: jest.fn(), post: jest.fn() } } as any,
        { decryptToken: () => 'TOKEN' } as any
    );
}

// ─── verifySignature ─────────────────────────────────────────────────────────

describe('TelegramPlatformAdapter.verifySignature', () => {
    it('accepts a matching secret token', () => {
        const a = makeAdapter();
        expect(
            a.verifySignature('{}', {
                'x-telegram-bot-api-secret-token': SECRET,
            })
        ).toBe(true);
    });

    it('rejects a mismatched secret token', () => {
        const a = makeAdapter();
        expect(
            a.verifySignature('{}', {
                'x-telegram-bot-api-secret-token': 'wrong-token',
            })
        ).toBe(false);
    });

    it('rejects when header is missing', () => {
        const a = makeAdapter();
        expect(a.verifySignature('{}', {})).toBe(false);
    });

    it('rejects when TELEGRAM_WEBHOOK_SECRET_TOKEN is not configured', () => {
        const a = makeAdapter('');
        expect(
            a.verifySignature('{}', {
                'x-telegram-bot-api-secret-token': SECRET,
            })
        ).toBe(false);
    });

    it('rejects when secret has invalid format (spaces)', () => {
        const a = makeAdapter('invalid secret with spaces');
        expect(
            a.verifySignature('{}', {
                'x-telegram-bot-api-secret-token': 'invalid secret with spaces',
            })
        ).toBe(false);
    });

    it('accepts case-insensitive header name variant', () => {
        const a = makeAdapter();
        expect(
            a.verifySignature('{}', {
                'X-Telegram-Bot-Api-Secret-Token': SECRET,
            })
        ).toBe(true);
    });
});

// ─── parse ───────────────────────────────────────────────────────────────────

describe('TelegramPlatformAdapter.parse', () => {
    const a = makeAdapter();

    const msg = (overrides: object = {}) =>
        JSON.stringify({
            update_id: 1,
            message: {
                message_id: 42,
                from: { id: 123, first_name: 'Alice' },
                chat: { id: 123, type: 'private' },
                date: 1_700_000_000,
                text: 'Hello',
                ...overrides,
            },
        });

    it('normalizes a text message', () => {
        const [e] = a.parse(msg());
        expect(e).toMatchObject({
            kind: 'message',
            senderId: '123',
            recipientId: '123',
            externalMessageId: '42',
            text: 'Hello',
        });
        expect(e.timestamp).toBeInstanceOf(Date);
    });

    it('parses a photo message', () => {
        const [e] = a.parse(
            msg({
                text: undefined,
                caption: 'look',
                photo: [
                    { file_id: 'small', width: 90, height: 90, file_size: 1 },
                    {
                        file_id: 'large',
                        width: 800,
                        height: 800,
                        file_size: 100,
                    },
                ],
            })
        );
        expect(e.text).toBe('look');
        expect(e.attachments?.[0]).toMatchObject({ type: 'image' });
    });

    it('parses a callback_query (inline button)', () => {
        const body = JSON.stringify({
            update_id: 2,
            callback_query: {
                id: 'cb1',
                from: { id: 456, first_name: 'Bob' },
                data: 'action_data',
                message: {
                    message_id: 10,
                    chat: { id: 456, type: 'private' },
                    date: 1_700_000_001,
                },
            },
        });
        const [e] = a.parse(body);
        expect(e.kind).toBe('postback');
        expect(e.senderId).toBe('456');
        expect(e.text).toBe('action_data');
        expect(e.externalMessageId).toBe('cb1');
    });

    it('parses edited_message as kind=unknown', () => {
        const body = JSON.stringify({
            update_id: 3,
            edited_message: {
                message_id: 99,
                from: { id: 789 },
                chat: { id: 789, type: 'private' },
                date: 1_700_000_002,
                text: 'edited',
            },
        });
        const [e] = a.parse(body);
        expect(e.kind).toBe('unknown');
        expect(e.text).toBe('edited');
    });

    it('returns [] for invalid JSON', () => {
        expect(a.parse('not json')).toEqual([]);
    });

    it('returns [] for non-object JSON', () => {
        expect(a.parse('"string"')).toEqual([]);
        expect(a.parse('null')).toEqual([]);
        expect(a.parse('42')).toEqual([]);
    });

    it('returns [] for unknown update types (e.g. channel_post)', () => {
        const body = JSON.stringify({ update_id: 4, channel_post: {} });
        expect(a.parse(body)).toEqual([]);
    });
});

// ─── doReact ─────────────────────────────────────────────────────────────────

describe('TelegramPlatformAdapter.doReact', () => {
    const config = {
        get: (k: string) =>
            k === 'telegram.apiUrl' ? 'https://api.telegram.org' : undefined,
    };

    const build = () => {
        const post = jest.fn().mockResolvedValue({ data: { ok: true } });
        const adapter = new TelegramPlatformAdapter(
            config as any,
            { axiosRef: { get: jest.fn(), post } } as any,
            { decryptToken: () => 'TOKEN' } as any
        );
        return { adapter, post };
    };

    it('calls setMessageReaction with an emoji reaction for react', async () => {
        const { adapter, post } = build();
        await adapter.addReaction(
            { accessToken: 'e' } as any,
            '123',
            '42',
            '👍',
            'react'
        );
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/setMessageReaction'),
            {
                chat_id: '123',
                message_id: 42,
                reaction: [{ type: 'emoji', emoji: '👍' }],
            }
        );
    });

    it('calls setMessageReaction with an empty reaction array for unreact', async () => {
        const { adapter, post } = build();
        await adapter.addReaction(
            { accessToken: 'e' } as any,
            '123',
            '42',
            '👍',
            'unreact'
        );
        expect(post).toHaveBeenCalledWith(
            expect.stringContaining('/setMessageReaction'),
            {
                chat_id: '123',
                message_id: 42,
                reaction: [],
            }
        );
    });
});
