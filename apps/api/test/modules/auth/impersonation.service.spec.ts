import { UnauthorizedException } from '@nestjs/common';
import { ImpersonationService } from '@app/modules/auth/services/impersonation.service';
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@app/modules/session/enums/session.status-code.enum';

describe('ImpersonationService', () => {
    const store = new Map<string, unknown>();
    const cache = {
        get: jest.fn(async (k: string) => store.get(k)),
        set: jest.fn(async (k: string, v: unknown, _ttl?: number) => {
            store.set(k, v);
        }),
        del: jest.fn(async (k: string) => void store.delete(k)),
    };
    const SESSION_CAP_SECONDS = 8 * 3600;
    const config = {
        get: jest.fn((k: string) =>
            k === 'auth.jwt.impersonateSession.expirationTime'
                ? SESSION_CAP_SECONDS
                : 'eccho'
        ),
    };

    const sessionService = {
        findOneActiveByIdAndUser: jest.fn(),
        findOneActiveById: jest.fn(),
        endImpersonation: jest.fn(),
        extendImpersonation: jest.fn(),
        setLoginSession: jest.fn(),
        deleteLoginSession: jest.fn(),
    };
    const userService = { findOneById: jest.fn() };
    const authService = { createImpersonationToken: jest.fn() };

    const build = () =>
        new ImpersonationService(
            cache as never,
            config as never,
            sessionService as never,
            userService as never,
            authService as never
        );

    const handoff = {
        tokenType: 'Bearer',
        roleType: 'USER',
        accessToken: 'signed.jwt',
        expiresIn: 600,
        impersonatedBy: 'admin-1',
        session: 'session-1',
        target: { id: 'u1', name: 'Nguyen Van A', email: 'a@example.com' },
    };

    beforeEach(() => {
        store.clear();
        jest.resetAllMocks();
        cache.get.mockImplementation(async (k: string) => store.get(k));
        cache.set.mockImplementation(async (k: string, v: unknown) => {
            store.set(k, v);
        });
        cache.del.mockImplementation(async (k: string) => void store.delete(k));
        config.get.mockImplementation((k: string) =>
            k === 'auth.jwt.impersonateSession.expirationTime'
                ? SESSION_CAP_SECONDS
                : 'eccho'
        );
    });

    it('issues an opaque code and stores the handoff with a 60s TTL', async () => {
        const service = build();

        const code = await service.issue(handoff);

        expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(cache.set).toHaveBeenCalledWith(
            expect.stringContaining(code),
            handoff,
            60_000
        );
    });

    it('consume returns the handoff exactly once then null', async () => {
        const service = build();
        const code = await service.issue(handoff);

        await expect(service.consume(code)).resolves.toEqual(handoff);
        await expect(service.consume(code)).resolves.toBeNull();
    });

    it('consume is single-use under concurrent calls', async () => {
        const service = build();
        const code = await service.issue(handoff);

        const results = await Promise.all([
            service.consume(code),
            service.consume(code),
            service.consume(code),
        ]);

        expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('consume returns null for an unknown code', async () => {
        await expect(build().consume('nope')).resolves.toBeNull();
    });

    describe('remainingSeconds', () => {
        it('reports the time left until expiresAt, not the full lifetime', () => {
            expect(
                ImpersonationService.remainingSeconds(
                    { expiresIn: 600, expiresAt: 1_000_000 + 555_000 },
                    1_000_000
                )
            ).toBe(555);
        });

        it('never goes negative', () => {
            expect(
                ImpersonationService.remainingSeconds(
                    { expiresIn: 600, expiresAt: 500 },
                    1_000_000
                )
            ).toBe(0);
        });

        it('falls back to expiresIn for handoffs stored without expiresAt', () => {
            expect(
                ImpersonationService.remainingSeconds({ expiresIn: 600 })
            ).toBe(600);
        });
    });

    describe('renew', () => {
        const NOW = new Date('2026-10-07T10:00:00.000Z');
        const payload = {
            user: 'u1',
            session: 's1',
            impersonatedBy: 'admin-1',
            impersonationNonce: 'nonce-current',
        };
        const row = (over: Record<string, unknown> = {}) => ({
            id: 's1',
            impersonatedBy: 'admin-1',
            // started 1h ago, cap 8h => 7h left
            createdAt: new Date(NOW.getTime() - 3600_000),
            ...over,
        });
        const target = {
            id: 'u1',
            status: 'ACTIVE',
            role: { type: 'USER' },
        };
        const admin = {
            id: 'admin-1',
            status: 'ACTIVE',
            role: { type: 'ADMIN' },
        };
        const issued = {
            tokenType: 'Bearer',
            roleType: 'USER',
            expiresIn: 600,
            accessToken: 'new.jwt',
        };

        // the nonce key is internal; arm it the way storeNonce does
        const armNonce = async (service: ImpersonationService, n: string) =>
            service.storeNonce('s1', n, 600_000);

        const happy = async () => {
            const service = build();
            await armNonce(service, 'nonce-current');
            sessionService.findOneActiveByIdAndUser.mockResolvedValue(row());
            sessionService.findOneActiveById.mockResolvedValue(row());
            sessionService.extendImpersonation.mockResolvedValue(true);
            userService.findOneById.mockImplementation(async (id: string) =>
                id === 'u1' ? target : admin
            );
            authService.createImpersonationToken.mockReturnValue(issued);
            return service;
        };

        beforeEach(() => {
            jest.useFakeTimers().setSystemTime(NOW);
        });
        afterEach(() => jest.useRealTimers());

        it('re-issues a token capped to the session time left, rotates the nonce and re-arms the kill switch', async () => {
            const service = await happy();

            const res = await service.renew(payload);

            expect(res.issued).toBe(issued);
            expect(res.sessionEndsAt).toBe(
                NOW.getTime() - 3600_000 + SESSION_CAP_SECONDS * 1000
            );
            // 7h left in the session => cap passed to the token service
            const args = authService.createImpersonationToken.mock.calls[0];
            expect(args.slice(0, 3)).toEqual([target, 's1', 'admin-1']);
            expect(args[3]).not.toBe('nonce-current'); // rotated
            expect(args[4]).toBe(7 * 3600);
            expect(sessionService.extendImpersonation).toHaveBeenCalledWith(
                's1',
                new Date(NOW.getTime() + 600_000)
            );
            expect(sessionService.setLoginSession).toHaveBeenCalledWith(
                target,
                expect.objectContaining({ id: 's1' }),
                600_000
            );
            // the rotated nonce is what the next renewal must present
            expect([...store.values()]).toContain(args[3]);
        });

        it('rejects the old token once a newer one has been issued, without ending the session', async () => {
            const service = await happy();
            await service.renew(payload);

            await expect(service.renew(payload)).rejects.toBeInstanceOf(
                UnauthorizedException
            );
            expect(sessionService.endImpersonation).not.toHaveBeenCalled();
        });

        it('rejects a token without a nonce', async () => {
            const service = await happy();

            await expect(
                service.renew({ ...payload, impersonationNonce: undefined })
            ).rejects.toBeInstanceOf(UnauthorizedException);
            expect(authService.createImpersonationToken).not.toHaveBeenCalled();
        });

        it('ends the session and audits it when the cap is reached', async () => {
            const service = await happy();
            sessionService.findOneActiveByIdAndUser.mockResolvedValue(
                row({
                    createdAt: new Date(
                        NOW.getTime() - SESSION_CAP_SECONDS * 1000 + 1_000
                    ),
                })
            );

            await expect(service.renew(payload)).rejects.toMatchObject({
                response: {
                    statusCode: ENUM_SESSION_STATUS_CODE_ERROR.EXPIRED,
                },
            });
            expect(sessionService.endImpersonation).toHaveBeenCalledWith(
                's1',
                'expired'
            );
            expect(authService.createImpersonationToken).not.toHaveBeenCalled();
        });

        it('401s when the session is gone or belongs to someone else', async () => {
            const service = await happy();
            sessionService.findOneActiveByIdAndUser.mockResolvedValue(null);
            await expect(service.renew(payload)).rejects.toBeInstanceOf(
                UnauthorizedException
            );

            sessionService.findOneActiveByIdAndUser.mockResolvedValue(
                row({ impersonatedBy: 'someone-else' })
            );
            await expect(service.renew(payload)).rejects.toBeInstanceOf(
                UnauthorizedException
            );
        });

        it('ends the session when the target was promoted out of the USER role', async () => {
            const service = await happy();
            userService.findOneById.mockImplementation(async (id: string) =>
                id === 'u1' ? { ...target, role: { type: 'ADMIN' } } : admin
            );

            await expect(service.renew(payload)).rejects.toBeInstanceOf(
                UnauthorizedException
            );
            expect(sessionService.endImpersonation).toHaveBeenCalledWith(
                's1',
                'ineligible'
            );
            expect(authService.createImpersonationToken).not.toHaveBeenCalled();
        });

        it.each([
            ['blocked', { status: 'BLOCKED', role: { type: 'ADMIN' } }],
            ['demoted to USER', { status: 'ACTIVE', role: { type: 'USER' } }],
            ['deleted', null],
        ])('ends the session when the acting admin is %s', async (_n, a) => {
            const service = await happy();
            userService.findOneById.mockImplementation(async (id: string) =>
                id === 'u1' ? target : a && { id, ...a }
            );

            await expect(service.renew(payload)).rejects.toBeInstanceOf(
                UnauthorizedException
            );
            expect(sessionService.endImpersonation).toHaveBeenCalledWith(
                's1',
                'ineligible'
            );
        });

        it('a super admin may keep impersonating', async () => {
            const service = await happy();
            userService.findOneById.mockImplementation(async (id: string) =>
                id === 'u1'
                    ? target
                    : { ...admin, role: { type: 'SUPER_ADMIN' } }
            );

            await expect(service.renew(payload)).resolves.toBeDefined();
        });

        it('401s when the session was revoked between the read and the extend', async () => {
            const service = await happy();
            sessionService.extendImpersonation.mockResolvedValue(false);

            await expect(service.renew(payload)).rejects.toBeInstanceOf(
                UnauthorizedException
            );
            expect(sessionService.setLoginSession).not.toHaveBeenCalled();
        });

        it('undoes the kill-switch and nonce writes when a revoke raced them', async () => {
            const service = await happy();
            // active when read, revoked by the time we re-check
            sessionService.findOneActiveById.mockResolvedValue(null);

            await expect(service.renew(payload)).rejects.toBeInstanceOf(
                UnauthorizedException
            );
            expect(sessionService.setLoginSession).toHaveBeenCalled();
            expect(sessionService.deleteLoginSession).toHaveBeenCalledWith(
                's1'
            );
            // no nonce survives, so no token of this session can renew again
            expect(
                [...store.keys()].some(k => k.includes('impersonation:nonce'))
            ).toBe(false);
        });

        it('serialises concurrent renewals of one session', async () => {
            const service = await happy();

            const results = await Promise.allSettled([
                service.renew(payload),
                service.renew(payload),
            ]);

            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(
                1
            );
            expect(authService.createImpersonationToken).toHaveBeenCalledTimes(
                1
            );
        });
    });
});
