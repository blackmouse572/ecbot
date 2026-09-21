// apps/api/test/modules/chatbot/services/chatbot-preview-session.service.spec.ts
import { createHash } from 'crypto';
import { ChatbotPreviewSessionService } from '../../../../src/modules/chatbot/services/chatbot-preview-session.service';

const SESSION_CONFIG = {
    ttlMs: 30 * 60 * 1000,
    maxTurns: 3,
    maxTotalChars: 100,
    maxMessageChars: 20,
    maxTurnsPerSession: 5,
    maxTurnsPerTokenHourly: 10,
};

function setup() {
    const store = new Map<string, unknown>();
    const cache = {
        get: jest.fn(async (k: string) => store.get(k)),
        set: jest.fn(async (k: string, v: unknown) => {
            store.set(k, v);
        }),
    };
    const config = {
        get: jest.fn((key: string) =>
            key === 'chatbot.session' ? SESSION_CONFIG : undefined
        ),
    };
    const service = new ChatbotPreviewSessionService(
        cache as never,
        config as never
    );
    return { service, cache, store };
}

const sessionId = '550e8400-e29b-41d4-a716-446655440000';

describe('ChatbotPreviewSessionService', () => {
    describe('key scoping', () => {
        // chat_session_id is client-generated, so keying Redis on it alone
        // would let anyone who guesses one read another tenant's transcript.
        it('scopes the workspace key by workspace, chatbot and user', () => {
            const { service } = setup();
            const key = service.workspaceKey({
                workspaceId: 'ws1',
                chatbotId: 'cb1',
                userId: 'u1',
                sessionId,
            });

            expect(key).toContain('ws1');
            expect(key).toContain('cb1');
            expect(key).toContain('u1');
            expect(key).not.toContain(sessionId);
            expect(key).toContain(
                createHash('sha256')
                    .update(sessionId)
                    .digest('hex')
                    .slice(0, 32)
            );
        });

        it('gives different users different keys for the same session id', () => {
            const { service } = setup();
            const base = {
                workspaceId: 'ws1',
                chatbotId: 'cb1',
                sessionId,
            };

            expect(service.workspaceKey({ ...base, userId: 'u1' })).not.toBe(
                service.workspaceKey({ ...base, userId: 'u2' })
            );
        });

        it('scopes the public key by the share token, never exposing it', () => {
            const { service } = setup();
            const key = service.publicKey({ token: 'tok-abc', sessionId });

            expect(key).not.toContain('tok-abc');
            expect(key).not.toContain(sessionId);
            expect(service.publicKey({ token: 'tok-xyz', sessionId })).not.toBe(
                key
            );
        });
    });

    describe('read / writeTurn', () => {
        it('returns an empty history for an unknown session', async () => {
            const { service } = setup();
            await expect(service.read('missing')).resolves.toEqual([]);
        });

        it('writes the user and assistant messages as a single turn', async () => {
            const { service, cache } = setup();
            await service.writeTurn('k', 'hello', 'hi there');

            expect(cache.set).toHaveBeenCalledTimes(1);
            await expect(service.read('k')).resolves.toEqual([
                { role: 'user', content: 'hello' },
                { role: 'assistant', content: 'hi there' },
            ]);
        });

        it('refreshes the sliding TTL on every write', async () => {
            const { service, cache } = setup();
            await service.writeTurn('k', 'a', 'b');

            expect(cache.set).toHaveBeenCalledWith(
                'k',
                expect.anything(),
                SESSION_CONFIG.ttlMs
            );
        });

        it('drops the oldest turns past maxTurns', async () => {
            const { service } = setup();
            for (let i = 0; i < 5; i++) {
                await service.writeTurn('k', `q${i}`, `a${i}`);
            }

            const history = await service.read('k');
            expect(history).toHaveLength(SESSION_CONFIG.maxTurns * 2);
            expect(history[0]).toEqual({ role: 'user', content: 'q2' });
        });

        it('drops the oldest turns past maxTotalChars', async () => {
            const { service } = setup();
            const long = 'x'.repeat(40);
            await service.writeTurn('k', long, long);
            await service.writeTurn('k', long, long);

            const history = await service.read('k');
            expect(history).toHaveLength(2);
            expect(
                history.reduce((n, m) => n + m.content.length, 0)
            ).toBeLessThanOrEqual(SESSION_CONFIG.maxTotalChars);
        });

        it('never persists a turn whose reply is empty', async () => {
            const { service, cache } = setup();
            await service.writeTurn('k', 'hello', '   ');

            expect(cache.set).not.toHaveBeenCalled();
            await expect(service.read('k')).resolves.toEqual([]);
        });

        it('tolerates a corrupt cache entry', async () => {
            const { service, store } = setup();
            store.set('k', 'not json');

            await expect(service.read('k')).resolves.toEqual([]);
        });
    });

    describe('turn budget', () => {
        it('allows turns up to the per-session cap', async () => {
            const { service } = setup();
            for (let i = 0; i < SESSION_CONFIG.maxTurnsPerSession; i++) {
                await expect(service.claimTurn('k')).resolves.toBe(true);
            }
        });

        it('refuses a turn past the per-session cap', async () => {
            const { service } = setup();
            for (let i = 0; i < SESSION_CONFIG.maxTurnsPerSession; i++) {
                await service.claimTurn('k');
            }

            await expect(service.claimTurn('k')).resolves.toBe(false);
        });

        it('counts budgets independently per key', async () => {
            const { service } = setup();
            for (let i = 0; i < SESSION_CONFIG.maxTurnsPerSession; i++) {
                await service.claimTurn('k1');
            }

            await expect(service.claimTurn('k2')).resolves.toBe(true);
        });

        it('refuses a turn past the hourly cap for a share token', async () => {
            const { service } = setup();
            for (let i = 0; i < SESSION_CONFIG.maxTurnsPerTokenHourly; i++) {
                await expect(service.claimTokenTurn('jti1')).resolves.toBe(
                    true
                );
            }

            await expect(service.claimTokenTurn('jti1')).resolves.toBe(false);
            await expect(service.claimTokenTurn('jti2')).resolves.toBe(true);
        });
    });

    // Turnstile tokens are single-use and short-lived, so a public preview
    // verifies the human ONCE per session and remembers it — challenging every
    // chat turn would put a widget in front of every message.
    describe('human verification', () => {
        it('starts unverified', async () => {
            const { service } = setup();
            await expect(service.isVerified('k')).resolves.toBe(false);
        });

        it('remembers a verified session', async () => {
            const { service } = setup();
            await service.markVerified('k');

            await expect(service.isVerified('k')).resolves.toBe(true);
        });

        it('keeps the flag across turns', async () => {
            const { service } = setup();
            await service.markVerified('k');
            await service.writeTurn('k', 'hello', 'hi');

            await expect(service.isVerified('k')).resolves.toBe(true);
            await expect(service.read('k')).resolves.toHaveLength(2);
        });

        it('does not leak verification between sessions', async () => {
            const { service } = setup();
            await service.markVerified('k1');

            await expect(service.isVerified('k2')).resolves.toBe(false);
        });

        it('refreshes the sliding TTL when marking verified', async () => {
            const { service, cache } = setup();
            await service.markVerified('k');

            expect(cache.set).toHaveBeenCalledWith(
                'k',
                expect.anything(),
                SESSION_CONFIG.ttlMs
            );
        });
    });

    describe('message limits', () => {
        it('exposes the configured max message length', () => {
            const { service } = setup();
            expect(service.maxMessageChars).toBe(
                SESSION_CONFIG.maxMessageChars
            );
        });
    });
});
