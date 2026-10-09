import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { HelperEncryptionService } from '@app/common/helper/services/helper.encryption.service';
import { REDIS_AVAILABLE } from '@app/common/redis/redis-availability.provider';
import { RedisConnectionProvider } from '@app/common/redis/redis-connection.provider';
import { MfaService } from '@app/modules/auth/services/mfa.service';
import { generateTotp } from '@app/modules/auth/utils/auth.totp.util';
import { SessionService } from '@app/modules/session/services/session.service';
import { UserService } from '@app/modules/user/services/user.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';

describe('MfaService', () => {
    let service: MfaService;

    // A Redis stand-in whose GETDEL, like the real one, hands a value to
    // exactly one caller.
    const redisStore = new Map<string, string>();
    const redisClient = {
        set: jest.fn(async (key: string, value: string) => {
            redisStore.set(key, value);
            return 'OK';
        }),
        get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
        getdel: jest.fn(async (key: string) => {
            const value = redisStore.get(key) ?? null;
            redisStore.delete(key);
            return value;
        }),
    };
    // Reversible stand-in: proves the stored value is the encrypted form.
    const encryption = {
        envelopeEncrypt: jest.fn((v: string) => `enc(${v})`),
        envelopeDecrypt: jest.fn((v: string) => v.slice(4, -1)),
    };

    // Models the conditional SQL updates: each check and write happens in
    // one synchronous step, as one UPDATE ... WHERE does in Postgres.
    const userService = {
        updateMfa: jest.fn(async (user: any, data: any) =>
            Object.assign(user, data)
        ),
        claimMfaTimeStep: jest.fn(async (user: any, step: number) => {
            const row = rows.get(user.id)!;
            if (row.mfaLastTimeStep != null && row.mfaLastTimeStep >= step) {
                return false;
            }
            row.mfaLastTimeStep = step;
            return true;
        }),
        consumeMfaRecoveryCode: jest.fn(async (user: any, hash: string) => {
            const row = rows.get(user.id)!;
            if (!row.mfaRecoveryCodes.includes(hash)) return false;
            row.mfaRecoveryCodes = row.mfaRecoveryCodes.filter(
                (h: string) => h !== hash
            );
            return true;
        }),
    };
    const sessionService = { updateManyRevokeByUser: jest.fn() };
    const cloudTasksClient = {
        enqueue: jest.fn().mockResolvedValue(undefined),
    };
    const rows = new Map<string, any>();

    const now = 1_700_000_000_000;

    async function build(redisAvailable: boolean): Promise<MfaService> {
        const module = await Test.createTestingModule({
            providers: [
                MfaService,
                {
                    provide: RedisConnectionProvider,
                    useValue: { client: redisClient },
                },
                { provide: REDIS_AVAILABLE, useValue: redisAvailable },
                {
                    provide: ConfigService,
                    useValue: { get: () => 'test-pepper' },
                },
                { provide: HelperEncryptionService, useValue: encryption },
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: CloudTasksQueueClient, useValue: cloudTasksClient },
            ],
        }).compile();
        return module.get(MfaService);
    }

    beforeEach(async () => {
        redisStore.clear();
        rows.clear();
        jest.clearAllMocks();
        service = await build(true);
    });

    const newUser = (): any => ({
        id: 'user-1',
        email: 'a@b.com',
        name: 'An',
        mfaEnabled: false,
    });

    async function enabledUser(): Promise<{
        user: any;
        secret: string;
        recoveryCodes: string[];
    }> {
        const user = newUser();
        const { secret } = await service.setup(user);
        const { recoveryCodes } = await service.enable(
            user,
            generateTotp(secret, now),
            now
        );
        // The "database row" the conditional updates act on.
        rows.set(user.id, {
            mfaLastTimeStep: user.mfaLastTimeStep,
            mfaRecoveryCodes: [...user.mfaRecoveryCodes],
        });
        return { user, secret, recoveryCodes };
    }

    it('stores a new secret encrypted and pending, and returns the otpauth URI', async () => {
        const user = newUser();
        const result = await service.setup(user);

        expect(result.secret).toMatch(/^[A-Z2-7]{32}$/);
        expect(result.otpauthUri).toContain(`secret=${result.secret}`);
        expect(result.otpauthUri).toContain('issuer=Eccho');
        expect(userService.updateMfa).toHaveBeenCalledWith(user, {
            mfaPendingSecret: `enc(${result.secret})`,
        });
        expect(user.mfaEnabled).toBe(false);
    });

    it('enables MFA and returns 10 recovery codes of 80 bits, stored only as peppered hashes', async () => {
        const { user, recoveryCodes } = await enabledUser();

        expect(user.mfaEnabled).toBe(true);
        expect(user.mfaPendingSecret).toBeNull();
        expect(user.mfaSecret).toMatch(/^enc\(/);
        expect(recoveryCodes).toHaveLength(10);
        expect(new Set(recoveryCodes).size).toBe(10);
        for (const code of recoveryCodes) {
            // 16 base32 characters = 80 bits.
            expect(code).toMatch(/^[a-z2-7]{4}(-[a-z2-7]{4}){3}$/);
            expect(user.mfaRecoveryCodes).not.toContain(code);
        }
        expect(user.mfaRecoveryCodes[0]).toMatch(/^[0-9a-f]{64}$/);
    });

    it('refuses to enable with a wrong code or without a pending setup', async () => {
        const user = newUser();
        await expect(service.enable(user, '000000', now)).rejects.toThrow(
            BadRequestException
        );

        await service.setup(user);
        await expect(service.enable(user, 'abcdef', now)).rejects.toThrow(
            BadRequestException
        );
        expect(user.mfaEnabled).toBe(false);
    });

    it('accepts a TOTP code once, then refuses the same code (replay)', async () => {
        const { user, secret } = await enabledUser();
        const later = now + 30_000;
        const code = generateTotp(secret, later);

        expect(await service.verify(user, code, later)).toBe('totp');
        expect(await service.verify(user, code, later)).toBeNull();
        expect(userService.claimMfaTimeStep).toHaveBeenCalledTimes(2);
    });

    it('lets only one of two concurrent verifications of the same TOTP code through', async () => {
        const { user, secret } = await enabledUser();
        const later = now + 30_000;
        const code = generateTotp(secret, later);

        const results = await Promise.all([
            service.verify(user, code, later),
            service.verify(user, code, later),
        ]);

        expect(results.filter(r => r === 'totp')).toHaveLength(1);
        expect(results.filter(r => r === null)).toHaveLength(1);
    });

    it('accepts each recovery code exactly once, in any letter case or dash format', async () => {
        const { user, recoveryCodes } = await enabledUser();
        const [first, second] = recoveryCodes;

        expect(await service.verify(user, first, now)).toBe('recovery');
        expect(rows.get(user.id).mfaRecoveryCodes).toHaveLength(9);
        expect(await service.verify(user, first, now)).toBeNull();

        expect(
            await service.verify(
                user,
                ` ${second.replace(/-/g, '').toUpperCase()} `,
                now
            )
        ).toBe('recovery');
        expect(rows.get(user.id).mfaRecoveryCodes).toHaveLength(8);
    });

    it('lets only one of two concurrent uses of the same recovery code through', async () => {
        const { user, recoveryCodes } = await enabledUser();

        const results = await Promise.all([
            service.verify(user, recoveryCodes[0], now),
            service.verify(user, recoveryCodes[0], now),
        ]);

        expect(results.filter(r => r === 'recovery')).toHaveLength(1);
        expect(rows.get(user.id).mfaRecoveryCodes).toHaveLength(9);
    });

    it('refuses any code when MFA is off', async () => {
        expect(await service.verify(newUser(), '123456', now)).toBeNull();
    });

    it('replaces every recovery code on regenerate', async () => {
        const { user, recoveryCodes } = await enabledUser();
        const oldHashes = [...user.mfaRecoveryCodes];

        const { recoveryCodes: fresh } =
            await service.regenerateRecoveryCodes(user);

        expect(fresh).toHaveLength(10);
        expect(fresh).not.toContain(recoveryCodes[0]);
        expect(user.mfaRecoveryCodes).toHaveLength(10);
        for (const hash of oldHashes) {
            expect(user.mfaRecoveryCodes).not.toContain(hash);
        }
    });

    it('clears every MFA field on disable', async () => {
        const { user } = await enabledUser();
        await service.disable(user);

        expect(userService.updateMfa).toHaveBeenLastCalledWith(user, {
            mfaEnabled: false,
            mfaSecret: null,
            mfaPendingSecret: null,
            mfaRecoveryCodes: null,
            mfaLastTimeStep: null,
        });
    });

    it('revokes the other sessions and queues the change email', async () => {
        const user = newUser();
        await service.revokeSessionsAndNotify(user, true, {
            keepSession: 'session-1',
            language: 'vi',
        });

        expect(sessionService.updateManyRevokeByUser).toHaveBeenCalledWith(
            'user-1',
            undefined,
            'session-1'
        );
        expect(cloudTasksClient.enqueue).toHaveBeenCalledWith(
            'email',
            'MFA_CHANGED',
            {
                send: { email: 'a@b.com', name: 'An' },
                data: { enabled: true, language: 'vi' },
            },
            expect.anything()
        );
    });

    it('does not fail when the change email cannot be queued', async () => {
        cloudTasksClient.enqueue.mockRejectedValueOnce(new Error('down'));

        await expect(
            service.revokeSessionsAndNotify(newUser(), false)
        ).resolves.toBeUndefined();
    });

    describe.each([
        ['Redis', true],
        ['in-memory fallback', false],
    ])('challenges (%s)', (_label, redisAvailable) => {
        beforeEach(async () => {
            service = await build(redisAvailable);
        });

        it('issues an opaque challenge that can be read until spent', async () => {
            const token = await service.createChallenge({
                user: 'user-1',
                rememberMe: true,
            });

            expect(token).toMatch(/^[\w-]{43}$/);
            expect(await service.findChallenge(token)).toEqual({
                user: 'user-1',
                rememberMe: true,
            });
            expect(await service.consumeChallenge(token)).toEqual({
                user: 'user-1',
                rememberMe: true,
            });
            expect(await service.findChallenge(token)).toBeNull();
            expect(await service.consumeChallenge(token)).toBeNull();
        });

        it('hands one challenge to only one of two concurrent consumers', async () => {
            const token = await service.createChallenge({ user: 'user-1' });

            const results = await Promise.all([
                service.consumeChallenge(token),
                service.consumeChallenge(token),
            ]);

            expect(results.filter(r => r !== null)).toHaveLength(1);
        });
    });

    it('stores a challenge in Redis with the 5-minute expiry', async () => {
        await service.createChallenge({ user: 'user-1' });

        expect(redisClient.set).toHaveBeenCalledWith(
            expect.stringMatching(/^auth:mfa:challenge:[0-9a-f]{64}$/),
            JSON.stringify({ user: 'user-1' }),
            'PX',
            300_000
        );
    });
});
