// apps/api/test/modules/chatbot/services/chatbot-share-token.service.spec.ts
import { JwtService } from '@nestjs/jwt';
import { ChatbotShareTokenService } from '../../../../src/modules/chatbot/services/chatbot-share-token.service';

const SECRET = 'preview-share-secret';
const MAX_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

function setup(...args: [] | [string | undefined]) {
    const secret = args.length ? args[0] : SECRET;
    const jwtService = new JwtService({});
    const configService = {
        get: jest.fn((key: string) =>
            key === 'chatbot.share'
                ? { secret, maxExpiresInMs: MAX_EXPIRES_IN_MS }
                : undefined
        ),
    };
    const service = new ChatbotShareTokenService(
        jwtService,
        configService as never
    );
    return { service, jwtService };
}

describe('ChatbotShareTokenService', () => {
    describe('create', () => {
        it('round-trips the chatbot and workspace', () => {
            const { service } = setup();
            const { token } = service.create({
                chatbotId: 'cb1',
                workspaceId: 'ws1',
                expiresInMs: 3600_000,
            });

            const payload = service.verify(token);
            expect(payload.chatbotId).toBe('cb1');
            expect(payload.workspaceId).toBe('ws1');
        });

        it('returns the absolute expiry alongside the token', () => {
            const { service } = setup();
            const before = Date.now();
            const { expiresAt } = service.create({
                chatbotId: 'cb1',
                workspaceId: 'ws1',
                expiresInMs: 3600_000,
            });

            expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
                before + 3600_000 - 2000
            );
            expect(expiresAt.getTime()).toBeLessThanOrEqual(
                Date.now() + 3600_000 + 2000
            );
        });

        it('gives every link a distinct jti so budgets are counted per link', () => {
            const { service } = setup();
            const args = {
                chatbotId: 'cb1',
                workspaceId: 'ws1',
                expiresInMs: 3600_000,
            };

            const a = service.verify(service.create(args).token);
            const b = service.verify(service.create(args).token);
            expect(a.jti).toBeTruthy();
            expect(a.jti).not.toBe(b.jti);
        });

        it('clamps an over-long expiry to the configured maximum', () => {
            const { service } = setup();
            const { expiresAt } = service.create({
                chatbotId: 'cb1',
                workspaceId: 'ws1',
                expiresInMs: 365 * 24 * 60 * 60 * 1000,
            });

            expect(expiresAt.getTime()).toBeLessThanOrEqual(
                Date.now() + MAX_EXPIRES_IN_MS + 2000
            );
        });

        it('fails loudly when no secret is configured', () => {
            const { service } = setup(undefined);

            expect(() =>
                service.create({
                    chatbotId: 'cb1',
                    workspaceId: 'ws1',
                    expiresInMs: 3600_000,
                })
            ).toThrow();
        });
    });

    describe('verify', () => {
        const invalid = { message: 'chatbot.error.shareLinkInvalid' };

        it('rejects a token signed with another secret', () => {
            const { service } = setup();
            const other = setup('different-secret');
            const { token } = other.service.create({
                chatbotId: 'cb1',
                workspaceId: 'ws1',
                expiresInMs: 3600_000,
            });

            expect(() => service.verify(token)).toThrow(
                expect.objectContaining({
                    response: expect.objectContaining(invalid),
                })
            );
        });

        it('rejects an expired token', () => {
            const { service, jwtService } = setup();
            const token = jwtService.sign(
                {
                    chatbotId: 'cb1',
                    workspaceId: 'ws1',
                    typ: 'chatbot-preview',
                },
                {
                    secret: SECRET,
                    algorithm: 'HS256',
                    expiresIn: '-1s',
                    jwtid: 'j1',
                }
            );

            expect(() => service.verify(token)).toThrow(
                expect.objectContaining({
                    response: expect.objectContaining({
                        message: 'chatbot.error.shareLinkExpired',
                    }),
                })
            );
        });

        // A token minted for another purpose must not open a preview.
        it('rejects a token whose typ is not chatbot-preview', () => {
            const { service, jwtService } = setup();
            const token = jwtService.sign(
                {
                    chatbotId: 'cb1',
                    workspaceId: 'ws1',
                    typ: 'workspace-invite',
                },
                {
                    secret: SECRET,
                    algorithm: 'HS256',
                    expiresIn: '1h',
                    jwtid: 'j1',
                }
            );

            expect(() => service.verify(token)).toThrow(
                expect.objectContaining({
                    response: expect.objectContaining(invalid),
                })
            );
        });

        it('rejects a token missing a jti', () => {
            const { service, jwtService } = setup();
            const token = jwtService.sign(
                {
                    chatbotId: 'cb1',
                    workspaceId: 'ws1',
                    typ: 'chatbot-preview',
                },
                { secret: SECRET, algorithm: 'HS256', expiresIn: '1h' }
            );

            expect(() => service.verify(token)).toThrow(
                expect.objectContaining({
                    response: expect.objectContaining(invalid),
                })
            );
        });

        // Algorithm confusion: an unsigned token must never be accepted.
        it('rejects an alg:none token', () => {
            const { service } = setup();
            const header = Buffer.from(
                JSON.stringify({ alg: 'none', typ: 'JWT' })
            ).toString('base64url');
            const body = Buffer.from(
                JSON.stringify({
                    chatbotId: 'cb1',
                    workspaceId: 'ws1',
                    typ: 'chatbot-preview',
                    jti: 'j1',
                    exp: Math.floor(Date.now() / 1000) + 3600,
                })
            ).toString('base64url');

            expect(() => service.verify(`${header}.${body}.`)).toThrow(
                expect.objectContaining({
                    response: expect.objectContaining(invalid),
                })
            );
        });

        it('rejects garbage', () => {
            const { service } = setup();
            expect(() => service.verify('not-a-token')).toThrow(
                expect.objectContaining({
                    response: expect.objectContaining(invalid),
                })
            );
        });
    });
});
