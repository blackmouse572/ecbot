import { ENUM_SESSION_STATUS } from '../../../src/modules/session/enums/session.enum';
import { SessionService } from '../../../src/modules/session/services/session.service';

describe('SessionService (geo + activity additions)', () => {
    const nativeUpdate = jest.fn();
    const persist = jest.fn();
    const flush = jest.fn(async () => undefined);
    const getReference = jest.fn((_e: any, id: string) => ({ id }));
    const em = { getReference, nativeUpdate, persist, flush };

    const mockRepo = {
        create: jest.fn(async (e: any) => e),
        findOneById: jest.fn(),
        find: jest.fn(async () => []),
        findOne: jest.fn(),
        updateMany: jest.fn(async () => []),
        getEntityManager: jest.fn(() => em),
    };
    const fixedNow = new Date('2026-07-07T12:00:00.000Z');
    const mockDate = {
        create: jest.fn(() => fixedNow),
        forward: jest.fn(() => new Date('2026-07-14T12:00:00.000Z')),
        backward: jest.fn(() => new Date('2026-07-07T11:59:00.000Z')),
    };
    const mockConfig = {
        get: jest.fn((key: string) =>
            key.includes('expirationTime') ? 3600 : 'x'
        ),
    };
    const mockCloudTasksClient = {
        enqueue: jest.fn(async () => undefined),
        deleteTask: jest.fn(async () => undefined),
    };
    const mockCache = {
        get: jest.fn(async () => undefined),
        set: jest.fn(async () => undefined),
        del: jest.fn(async () => undefined),
    };
    const mockMessageService = {
        setMessage: jest.fn(() => 'session not found'),
    };

    const build = () =>
        new SessionService(
            mockCache as any,
            mockConfig as any,
            mockDate as any,
            mockRepo as any,
            mockMessageService as any
        );

    beforeEach(() => jest.clearAllMocks());

    describe('create', () => {
        it('creates an active session from the request', async () => {
            const service = build();
            const request: any = {
                hostname: 'h',
                ip: '8.8.8.8',
                protocol: 'https',
                originalUrl: '/x',
                method: 'POST',
                headers: {},
            };

            await service.create(request, { user: 'u1' } as any);

            const created = mockRepo.create.mock.calls[0][0];
            expect(created.ip).toBe('8.8.8.8');
            expect(created.country).toBeUndefined();
            expect(created.status).toBe(ENUM_SESSION_STATUS.ACTIVE);
        });
    });

    describe('touchLastActive', () => {
        it('writes lastActiveAt when the throttle cache is cold', async () => {
            const service = build();

            await service.touchLastActive('s1');

            expect(mockCache.set).toHaveBeenCalledTimes(1);
            expect(nativeUpdate).toHaveBeenCalledTimes(1);
            const [, filter, data] = nativeUpdate.mock.calls[0];
            expect(filter).toEqual({ id: 's1' });
            expect(data.lastActiveAt).toBe(fixedNow);
        });

        it('short-circuits (no DB write) within the throttle window', async () => {
            mockCache.get.mockResolvedValueOnce(1);
            const service = build();

            await service.touchLastActive('s1');

            expect(nativeUpdate).not.toHaveBeenCalled();
        });

        it('never throws (fire-and-forget safe) when the update fails', async () => {
            nativeUpdate.mockRejectedValueOnce(new Error('db down'));
            const service = build();
            await expect(
                service.touchLastActive('s1')
            ).resolves.toBeUndefined();
        });
    });

    describe('mapAdminList', () => {
        it('maps entities to the nested-user admin DTO', () => {
            const service = build();
            const result = service.mapAdminList([
                {
                    id: 'sess-1',
                    status: ENUM_SESSION_STATUS.ACTIVE,
                    user: { id: 'u1', email: 'a@b.co', name: 'Al' },
                    ip: '1.1.1.1',
                    country: 'US',
                } as any,
            ]);
            expect(result).toHaveLength(1);
            expect(result[0].user).toEqual(
                expect.objectContaining({ id: 'u1', email: 'a@b.co' })
            );
            expect(result[0].country).toBe('US');
        });

        it('does not leak sensitive user fields (password/salt)', () => {
            const service = build();
            const result = service.mapAdminList([
                {
                    id: 'sess-1',
                    status: ENUM_SESSION_STATUS.ACTIVE,
                    user: {
                        id: 'u1',
                        email: 'a@b.co',
                        name: 'Al',
                        password: 'HASH',
                        salt: 'SALT',
                    },
                    ip: '1.1.1.1',
                } as any,
            ]);
            expect(result[0].user).not.toHaveProperty('password');
            expect(result[0].user).not.toHaveProperty('salt');
        });
    });

    describe('login session tasks', () => {
        it('writes login cache without scheduling a revocation task', async () => {
            const service = build();
            const session = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                createdAt: new Date('2026-07-07T12:00:00.000Z'),
            };

            await service.setLoginSession({ id: 'u1' } as any, session as any);

            // cache-manager v6 `set(key, value, ttl)` takes milliseconds, while
            // refreshTokenExpiration (auth.jwt.refreshToken.expirationTime) is
            // stored in seconds — passing the raw seconds value expired the
            // login session ~1000x too early (a 7-day refresh window collapsed
            // to ~10 minutes), silently logging every user out once the access
            // strategy started checking this key.
            expect(mockCache.set).toHaveBeenCalledWith(
                'x:x:550e8400-e29b-41d4-a716-446655440000',
                { user: 'u1' },
                3600 * 1000
            );
            expect(mockCloudTasksClient.enqueue).not.toHaveBeenCalled();
        });

        it('deletes only the cache key without touching Cloud Tasks', async () => {
            const service = build();
            const sessionId = '550e8400-e29b-41d4-a716-446655440000';

            await service.deleteLoginSession(sessionId);

            expect(mockCache.del).toHaveBeenCalledWith(
                'x:x:550e8400-e29b-41d4-a716-446655440000'
            );
            expect(mockCloudTasksClient.deleteTask).not.toHaveBeenCalled();
        });
    });

    describe('processDeleteLoginSession', () => {
        it('throws the localized missing-session error', async () => {
            mockRepo.findOneById.mockResolvedValueOnce(undefined);
            const service = build();

            await expect(
                service.processDeleteLoginSession(
                    '550e8400-e29b-41d4-a716-446655440000'
                )
            ).rejects.toThrow('session not found');
            expect(mockMessageService.setMessage).toHaveBeenCalledWith(
                'session.error.notFound'
            );
        });

        it('revokes an existing session and persists the update', async () => {
            const session = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                status: ENUM_SESSION_STATUS.ACTIVE,
                revokeAt: undefined,
            };
            mockRepo.findOneById.mockResolvedValueOnce(session);
            const service = build();

            await service.processDeleteLoginSession(session.id);

            expect(session.status).toBe(ENUM_SESSION_STATUS.REVOKED);
            expect(session.revokeAt).toBe(fixedNow);
            expect(persist).toHaveBeenCalledWith(session);
            expect(flush).toHaveBeenCalledTimes(1);
        });
    });

    describe('updateManyRevokeByUser', () => {
        it('scopes the update to ACTIVE sessions only, so already-revoked rows keep their revokeAt', async () => {
            const service = build();

            await service.updateManyRevokeByUser('u1');

            expect(mockRepo.updateMany).toHaveBeenCalledWith(
                { user: 'u1', status: ENUM_SESSION_STATUS.ACTIVE },
                { status: ENUM_SESSION_STATUS.REVOKED, revokeAt: fixedNow },
                undefined
            );
        });

        it('returns false when nothing was actually revoked', async () => {
            mockRepo.updateMany.mockResolvedValueOnce([]);
            const service = build();

            await expect(service.updateManyRevokeByUser('u1')).resolves.toBe(
                false
            );
        });

        it('returns true when at least one session was revoked', async () => {
            mockRepo.updateMany.mockResolvedValueOnce([{ id: 's1' }]);
            const service = build();

            await expect(service.updateManyRevokeByUser('u1')).resolves.toBe(
                true
            );
        });
    });

    describe('findOneActiveById', () => {
        it('looks up by status, not expiry, so a session still labelled ACTIVE (but not yet swept) is still revocable', async () => {
            const service = build();

            await service.findOneActiveById('s1');

            expect(mockRepo.findOne).toHaveBeenCalledWith(
                { id: 's1', status: ENUM_SESSION_STATUS.ACTIVE },
                undefined
            );
        });
    });

    describe('findOneActiveByIdAndUser', () => {
        it('looks up by status, not expiry, scoped to the owning user', async () => {
            const service = build();

            await service.findOneActiveByIdAndUser('s1', 'u1');

            expect(mockRepo.findOne).toHaveBeenCalledWith(
                { id: 's1', user: 'u1', status: ENUM_SESSION_STATUS.ACTIVE },
                undefined
            );
        });
    });

    describe('mapAdminList with currentSessionId', () => {
        it('marks the row whose id matches the current session as isCurrent', () => {
            const service = build();
            const result = service.mapAdminList(
                [
                    {
                        id: 'sess-1',
                        status: ENUM_SESSION_STATUS.ACTIVE,
                        user: { id: 'u1', email: 'a@b.co', name: 'Al' },
                    } as any,
                ],
                'sess-1'
            );

            expect(result[0].isCurrent).toBe(true);
        });

        it('does not mark a different session as current', () => {
            const service = build();
            const result = service.mapAdminList(
                [
                    {
                        id: 'sess-1',
                        status: ENUM_SESSION_STATUS.ACTIVE,
                        user: { id: 'u1', email: 'a@b.co', name: 'Al' },
                    } as any,
                ],
                'sess-OTHER'
            );

            expect(result[0].isCurrent).toBe(false);
        });

        it('defaults isCurrent to false when no current session id is given', () => {
            const service = build();
            const result = service.mapAdminList([
                {
                    id: 'sess-1',
                    status: ENUM_SESSION_STATUS.ACTIVE,
                    user: { id: 'u1', email: 'a@b.co', name: 'Al' },
                } as any,
            ]);

            expect(result[0].isCurrent).toBe(false);
        });
    });
});
